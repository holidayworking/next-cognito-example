import { useEffect, useState } from 'react';

import axios from 'axios';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const getMessage = async () => {
      if (session) {
        const response = await axios.get(process.env['NEXT_PUBLIC_BACKEND_URL'] as string, {
          headers: {
            Authorization: `Bearer ${session.user.idToken}`,
          },
        });
        setMessage(response.data.message);
      }
    };
    getMessage();
  }, [session]);

  if (session) {
    return (
      <>
        Signed in as {session.user?.email} <br />
        {message} <br />
        <button onClick={() => signOut()}>Sign out</button>
      </>
    );
  }
  return (
    <>
      Not signed in <br />
      <button onClick={() => signIn('cognito')}>Sign in</button>
    </>
  );
}
