
//app/login/page.tsx






"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);
  
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true); 

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            setIsLoading(false); 

        } else {
            await updateLastLogin(); 
            setIsLoading(false); 
            router.push('/'); 
        }
    };

    const updateLastLogin = async () => {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
            console.error('Error fetching user:', userError);
            return;
        }

        if (user) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() }) 
                .eq('id', user.id);

            if (updateError) {
                console.error('Error updating last login time:', updateError);
            }
        }
    };


    return (
        <div className="flex items-center dark:bg-gray-800  dark:text-white justify-center min-h-screen bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white dark:bg-gray-900  dark:text-gray-600 p-6 rounded shadow-md">
                <h2 className="text-2xl mb-4">Login</h2>
                {error && <p className="text-red-500 mb-2">{error}</p>}
                {isLoading && <p className="text-blue-500 mb-2">Logging in...</p>} {/* Loader */}

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="border border-gray-300 p-2 mb-4 w-full"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="border border-gray-300 p-2 mb-4 w-full"
                />
              
              <button type="submit" className="bg-blue-500 text-white p-2 rounded w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
                
                <p className="mt-4">
                    Don't have an account? <Link href="/signup" className="text-blue-500">Sign up</Link>
                </p>
            </form>
          
        </div>
    );
};

export default Login;
