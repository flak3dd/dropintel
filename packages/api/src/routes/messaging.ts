import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../services/db.js';
import nodemailer from 'nodemailer';

export async function messagingRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/suppliers/:supplierId/threads
  fastify.get('/api/suppliers/:supplierId/threads', async (request, reply) => {
    const { supplierId } = request.params as { supplierId: string };
    const rows = await query(
      `SELECT st.*, s.name as supplier_name,
              (SELECT body FROM supplier_messages sm WHERE sm.thread_id = st.id ORDER BY sm.created_at DESC LIMIT 1) as last_message_preview,
              (SELECT COUNT(*) FROM supplier_messages sm WHERE sm.thread_id = st.id AND sm.read = FALSE AND sm.direction = 'inbound') as unread_count
       FROM supplier_threads st
       JOIN suppliers s ON s.id = st.supplier_id
       WHERE st.supplier_id = $1
       ORDER BY st.last_message_at DESC`,
      [supplierId]
    );
    return reply.send(rows);
  });

  // GET /api/threads — all threads
  fastify.get('/api/threads', async (_request, reply) => {
    const rows = await query(
      `SELECT st.*, s.name as supplier_name, s.contact_email,
              p.title as product_title,
              (SELECT body FROM supplier_messages sm WHERE sm.thread_id = st.id ORDER BY sm.created_at DESC LIMIT 1) as last_message_preview,
              (SELECT COUNT(*) FROM supplier_messages sm WHERE sm.thread_id = st.id AND sm.read = FALSE AND sm.direction = 'inbound') as unread_count
       FROM supplier_threads st
       JOIN suppliers s ON s.id = st.supplier_id
       LEFT JOIN products p ON p.id = st.product_id
       ORDER BY st.last_message_at DESC`
    );
    return reply.send(rows);
  });

  // GET /api/threads/:threadId
  fastify.get('/api/threads/:threadId', async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const thread = await queryOne(
      `SELECT st.*, s.name as supplier_name, s.contact_email, s.contact_whatsapp,
              p.title as product_title
       FROM supplier_threads st
       JOIN suppliers s ON s.id = st.supplier_id
       LEFT JOIN products p ON p.id = st.product_id
       WHERE st.id = $1`,
      [threadId]
    );
    if (!thread) return reply.status(404).send({ error: 'Thread not found' });

    const messages = await query(
      `SELECT * FROM supplier_messages WHERE thread_id = $1 ORDER BY created_at ASC`,
      [threadId]
    );

    // Mark inbound as read
    await query(
      `UPDATE supplier_messages SET read = TRUE WHERE thread_id = $1 AND direction = 'inbound' AND read = FALSE`,
      [threadId]
    );

    return reply.send({ thread, messages });
  });

  // POST /api/threads — create new thread
  fastify.post('/api/threads', async (request, reply) => {
    const { supplier_id, product_id, subject, body, sent_via } = request.body as {
      supplier_id: string;
      product_id?: string;
      subject: string;
      body: string;
      sent_via?: string;
    };

    if (!supplier_id || !subject || !body) {
      return reply.status(400).send({ error: 'supplier_id, subject, and body are required' });
    }

    const thread = await queryOne<{ id: string }>(
      `INSERT INTO supplier_threads (supplier_id, product_id, subject, status, last_message_at)
       VALUES ($1, $2, $3, 'open', NOW())
       RETURNING *`,
      [supplier_id, product_id ?? null, subject]
    );

    if (!thread) return reply.status(500).send({ error: 'Failed to create thread' });

    await query(
      `INSERT INTO supplier_messages (thread_id, direction, body, sender_name, read, sent_via)
       VALUES ($1, 'outbound', $2, 'DropIntel Team', TRUE, $3)`,
      [thread.id, body, sent_via ?? 'email']
    );

    await query(
      `UPDATE suppliers SET last_contacted = NOW() WHERE id = $1`,
      [supplier_id]
    );

    return reply.status(201).send(thread);
  });

  // POST /api/threads/:threadId/reply
  fastify.post('/api/threads/:threadId/reply', async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const { body, direction, sender_name, sent_via } = request.body as {
      body: string;
      direction: 'outbound' | 'inbound';
      sender_name?: string;
      sent_via?: string;
    };

    if (!body || !direction) {
      return reply.status(400).send({ error: 'body and direction are required' });
    }

    const message = await queryOne(
      `INSERT INTO supplier_messages (thread_id, direction, body, sender_name, read, sent_via)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [threadId, direction, body, sender_name ?? (direction === 'outbound' ? 'DropIntel Team' : 'Supplier'), direction === 'outbound', sent_via ?? 'email']
    );

    const newStatus = direction === 'inbound' ? 'replied' : 'open';
    await query(
      `UPDATE supplier_threads SET last_message_at = NOW(), status = $2 WHERE id = $1`,
      [threadId, newStatus]
    );

    if (direction === 'outbound') {
      await query(
        `UPDATE suppliers SET last_contacted = NOW()
         WHERE id = (SELECT supplier_id FROM supplier_threads WHERE id = $1)`,
        [threadId]
      );
    }

    return reply.status(201).send(message);
  });

  // PATCH /api/threads/:threadId
  fastify.patch('/api/threads/:threadId', async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const { status } = request.body as { status?: string };

    const thread = await queryOne(
      `UPDATE supplier_threads SET status = COALESCE($2, status) WHERE id = $1 RETURNING *`,
      [threadId, status ?? null]
    );

    if (!thread) return reply.status(404).send({ error: 'Thread not found' });
    return reply.send(thread);
  });

  // DELETE /api/threads/:threadId
  fastify.delete('/api/threads/:threadId', async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    await query(`DELETE FROM supplier_threads WHERE id = $1`, [threadId]);
    return reply.status(204).send();
  });

  // POST /api/threads/:threadId/send-email
  fastify.post('/api/threads/:threadId/send-email', async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    const { body } = request.body as { body: string };

    const thread = await queryOne<{
      subject: string;
      supplier_name: string;
      contact_email: string;
    }>(
      `SELECT st.subject, s.name as supplier_name, s.contact_email
       FROM supplier_threads st
       JOIN suppliers s ON s.id = st.supplier_id
       WHERE st.id = $1`,
      [threadId]
    );

    if (!thread) return reply.status(404).send({ error: 'Thread not found' });
    if (!thread.contact_email) {
      return reply.status(400).send({ error: 'Supplier has no email address configured' });
    }

    const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT ?? '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        await transporter.sendMail({
          from: SMTP_FROM ?? SMTP_USER,
          to: thread.contact_email,
          subject: thread.subject,
          text: body,
        });

        // Save as outbound message
        await query(
          `INSERT INTO supplier_messages (thread_id, direction, body, sender_name, read, sent_via)
           VALUES ($1, 'outbound', $2, 'DropIntel Team', TRUE, 'email')`,
          [threadId, body]
        );
        await query(`UPDATE supplier_threads SET last_message_at = NOW() WHERE id = $1`, [threadId]);

        return reply.send({ sent: true });
      } catch (err) {
        return reply.status(500).send({ error: 'Failed to send email', detail: (err as Error).message });
      }
    }

    // No SMTP — return mailto link
    const mailto = `mailto:${thread.contact_email}?subject=${encodeURIComponent(thread.subject)}&body=${encodeURIComponent(body)}`;
    return reply.send({ sent: false, mailto });
  });
}
