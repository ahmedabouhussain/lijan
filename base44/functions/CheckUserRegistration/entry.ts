import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// CheckUserRegistration — checks if a user with the given email is already registered.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { email } = body;
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    return Response.json({ registered: !!(users && users.length > 0) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}