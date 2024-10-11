"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [age, setAge] = useState<number | null>(null);
    const [location, setLocation] = useState('');
    const [mathMarks10, setMathMarks10] = useState<number | null>(null);
    const [scienceMarks10, setScienceMarks10] = useState<number | null>(null);
    const [englishMarks10, setEnglishMarks10] = useState<number | null>(null);
    const [socialScienceMarks10, setSocialScienceMarks10] = useState<number | null>(null);
    const [hindiMarks10, setHindiMarks10] = useState<number | null>(null);
    const [mathMarks12, setMathMarks12] = useState<number | null>(null);
    const [physicsMarks12, setPhysicsMarks12] = useState<number | null>(null);
    const [englishMarks12, setEnglishMarks12] = useState<number | null>(null);
    const [chemistryMarks12, setChemistryMarks12] = useState<number | null>(null);
    const [hindiMarks12, setHindiMarks12] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false); 
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);  

        const { data, error: signupError } = await supabase.auth.signUp({ email, password });

        if (signupError) {
            setError(signupError.message);
            setIsLoading(false); 

            console.error('Signup error:', signupError);
            return;
        }

        const { error: insertUserError } = await supabase
            .from('users')
            .insert([{ name, email, age, location, id: data.user?.id }]);

        if (insertUserError) {
            setError(insertUserError.message);
            setIsLoading(false); 

            return;
        }

        const { error: insertMarksError10 } = await supabase
            .from('tenth_class_marks')
            .insert([{
                user_id: data.user?.id,
                math_marks: mathMarks10,
                science_marks: scienceMarks10,
                english_marks: englishMarks10,
                social_science_marks: socialScienceMarks10,
                hindi_marks: hindiMarks10,
                year: new Date().getFullYear(),
            }]);

        if (insertMarksError10) {
            setError(insertMarksError10.message);
            setIsLoading(false); 

            return;
        }

        const { error: insertMarksError12 } = await supabase
            .from('twelfth_class_marks')
            .insert([{
                user_id: data.user?.id,
                math_marks: mathMarks12,
                chemistry_marks: chemistryMarks12,
                english_marks: englishMarks12,
                physics_marks: physicsMarks12,
                hindi_marks: hindiMarks12,
                year: new Date().getFullYear(), 
            }]);

        if (insertMarksError12) {
            setError(insertMarksError12.message);
            setIsLoading(false); 

            return;
        }
        setIsLoading(false); 

        router.push('/');
    };

    return (
        <div className="flex items-center dark:bg-gray-800  dark:text-white justify-center min-h-screen bg-gray-100 p-4">
            <form onSubmit={handleSignup} className="bg-white dark:bg-gray-700  dark:text-gray-500 p-8 rounded-lg w-full max-w-3xl shadow-lg">
                <h2 className="text-3xl font-semibold mb-6 text-center">Sign Up</h2>

                {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

                <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>


                    <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
                        <div className='flex flex-col space-y-4'>
                            <h3 className="text-lg font-semibold mb-2">Details</h3>

                            <div>
                                <label className="flex justify-between">
                                    <span>Name <span className="text-red-500">*</span></span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Name"
                                    required
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                            </div>

                            <div>
                                <label className="flex justify-between">
                                    <span>Email <span className="text-red-500">*</span></span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email"
                                    required
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                            </div>

                            <div>
                                <label className="flex justify-between">
                                    <span>Password<span className="text-red-500">*</span></span>
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    required
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                            </div>

                            <div>
                                <input
                                    type="number"
                                    value={age || ''}
                                    onChange={(e) => setAge(Number(e.target.value))}
                                    placeholder="Age (Optional)"
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                            </div>

                            <div>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Location (Optional)"
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 10th     */}
                    <div className='hidden md:block' >
                        <div className='flex   flex-col space-y-4'>
                            <h3 className="text-lg font-semibold mb-2">10th Class Marks (Optional)</h3>
                            <input
                                type="number"
                                placeholder='Maths Marks'
                                value={mathMarks10 || ''}
                                onChange={(e) => setMathMarks10(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />
                            <input
                                type="number"
                                placeholder='Science Marks'
                                value={scienceMarks10 || ''}
                                onChange={(e) => setScienceMarks10(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />
                            <input
                                type="number"
                                placeholder='English Marks'
                                value={englishMarks10 || ''}
                                onChange={(e) => setEnglishMarks10(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />
                            <input
                                type="number"
                                placeholder='Social Science Marks'
                                value={socialScienceMarks10 || ''}
                                onChange={(e) => setSocialScienceMarks10(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />
                            <input
                                type="number"
                                placeholder='Hindi Marks'
                                value={hindiMarks10 || ''}
                                onChange={(e) => setHindiMarks10(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />
                        </div>
                    </div>

                    <div className=' md:hidden' >
                        <div className='flex   flex-col space-y-4'>
                            <summary>
                                <h3 className="text-lg font-semibold mb-2">10th Class Marks (Optional)</h3>

                            </summary>


                            <details>
                                <input
                                    type="number"
                                    placeholder='Maths Marks'
                                    value={mathMarks10 || ''}
                                    onChange={(e) => setMathMarks10(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                                <input
                                    type="number"
                                    placeholder='Science Marks'
                                    value={scienceMarks10 || ''}
                                    onChange={(e) => setScienceMarks10(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                                <input
                                    type="number"
                                    placeholder='English Marks'
                                    value={englishMarks10 || ''}
                                    onChange={(e) => setEnglishMarks10(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                                <input
                                    type="number"
                                    placeholder='Social Science Marks'
                                    value={socialScienceMarks10 || ''}
                                    onChange={(e) => setSocialScienceMarks10(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                                <input
                                    type="number"
                                    placeholder='Hindi Marks'
                                    value={hindiMarks10 || ''}
                                    onChange={(e) => setHindiMarks10(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                            </details>
                        </div>
                    </div>

                    {/* 12th */}
                    <div className='md:hidden '>
                        <div className='flex flex-col space-y-4'>
                            <summary>
                                <h3 className="text-lg font-semibold mb-2">12th Class Marks (Optional)</h3>

                            </summary>

                            <details>

                                <input
                                    type="number"
                                    placeholder='Math Marks'
                                    value={mathMarks12 || ''}
                                    onChange={(e) => setMathMarks12(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                                <input
                                    type="number"
                                    placeholder='Physics Marks'
                                    value={physicsMarks12 || ''}
                                    onChange={(e) => setPhysicsMarks12(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                                <input
                                    type="number"
                                    placeholder='English Marks'
                                    value={englishMarks12 || ''}
                                    onChange={(e) => setEnglishMarks12(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                                <input
                                    type="number"
                                    placeholder='Chemistry Marks'
                                    value={chemistryMarks12 || ''}
                                    onChange={(e) => setChemistryMarks12(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                                <input
                                    type="number"
                                    placeholder='Hindi Marks'
                                    value={hindiMarks12 || ''}
                                    onChange={(e) => setHindiMarks12(Number(e.target.value))}
                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                                />
                            </details>
                        </div>
                    </div>

                    <div className='hidden  md:block'>
                        <div className='flex flex-col space-y-4'>

                            <h3 className="text-lg font-semibold mb-2">12th Class Marks (Optional)</h3>





                            <input
                                type="number"
                                placeholder='Math Marks'
                                value={mathMarks12 || ''}
                                onChange={(e) => setMathMarks12(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />
                            <input
                                type="number"
                                placeholder='Physics Marks'
                                value={physicsMarks12 || ''}
                                onChange={(e) => setPhysicsMarks12(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />
                            <input
                                type="number"
                                placeholder='English Marks'
                                value={englishMarks12 || ''}
                                onChange={(e) => setEnglishMarks12(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />
                            <input
                                type="number"
                                placeholder='Chemistry Marks'
                                value={chemistryMarks12 || ''}
                                onChange={(e) => setChemistryMarks12(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />
                            <input
                                type="number"
                                placeholder='Hindi Marks'
                                value={hindiMarks12 || ''}
                                onChange={(e) => setHindiMarks12(Number(e.target.value))}
                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring focus:ring-blue-300"
                            />

                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600 w-full mt-6 transition duration-200"
                    disabled={isLoading}
                >
                    {isLoading ?
                        <div className="flex justify-center mt-4">
                            <div className="loader"></div>
                        </div>

                        : 'Sign Up'}
                </button>




                <p className="mt-4 text-sm text-gray-600 text-center">
                    Already have an account?{' '}
                    <Link href="/login" className="text-blue-500 hover:underline">
                        Log in here.
                    </Link>
                </p>
            </form>
        </div>

    );
};

export default Signup;




