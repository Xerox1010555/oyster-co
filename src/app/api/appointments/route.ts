import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { appointmentMail, sendMail } from '@/lib/mail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  try {
    const { boutiqueId, startsAt, service, name, email, phone, notes } = await request.json();
    if (!boutiqueId || !startsAt || !name || !EMAIL_RE.test(String(email ?? ''))) {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }
    const when = new Date(String(startsAt));
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
      return NextResponse.json({ error: 'startsAt must be in the future' }, { status: 400 });
    }
    const boutique = await prisma.boutique.findUnique({ where: { id: String(boutiqueId) } });
    if (!boutique) return NextResponse.json({ error: 'unknown boutique' }, { status: 404 });

    const user = await getSessionUser();
    const appointment = await prisma.appointment.create({
      data: {
        boutiqueId: boutique.id,
        userId: user?.id ?? null,
        name: String(name),
        email: String(email).toLowerCase(),
        phone: phone ? String(phone) : null,
        startsAt: when,
        service: ['consultation', 'fitting', 'servicing'].includes(String(service)) ? String(service) : 'consultation',
        notes: notes ? String(notes) : null,
      },
    });
    const mail = appointmentMail(
      String(name),
      boutique.cityEn,
      when.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }),
      appointment.service,
    );
    await sendMail({ to: appointment.email, subject: mail.subject, html: mail.html });
    return NextResponse.json({ ok: true, id: appointment.id });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
