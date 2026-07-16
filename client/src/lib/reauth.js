// session.accessToken is captured once at sign-in and never refreshed on its
// own, so a write made after the ~hour-long token expires throws
// UNAUTHENTICATED. Every call site used to just pop the sign-in dialog and
// drop the edit on the floor - no retry, mostly no visible error - which is
// exactly the "the sheet did not update" bug. This retries the write once
// with the freshly returned token instead of losing it.
export async function callWithReauth(session, fn) {
  try {
    return await fn(session.accessToken);
  } catch (err) {
    if (err.message !== 'UNAUTHENTICATED') throw err;
    const fresh = await session.signIn();
    if (!fresh?.accessToken) {
      throw new Error('Sign-in was needed to save that change and was not completed - please try again.');
    }
    return await fn(fresh.accessToken);
  }
}
