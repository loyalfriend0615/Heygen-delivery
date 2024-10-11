"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { ClipLoader } from 'react-spinners';

const TenthClassForm = () => {
    const [mathMarks, setMathMarks] = useState<number | null>(null);
    const [scienceMarks, setScienceMarks] = useState<number | null>(null);
    const [englishMarks, setEnglishMarks] = useState<number | null>(null);
    const [socialScienceMarks, setSocialScienceMarks] = useState<number | null>(null);
    const [hindiMarks, setHindiMarks] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const currentYear = new Date().getFullYear(); 
    const fetchMarks = async () => {
        setLoading(true); 
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('Authentication error:', userError);
            setError('Not authenticated');
            setLoading(false);
            return;
        }

        console.log('Fetching marks for user ID:', user.id); 

        const { data, error } = await supabase
            .from('tenth_class_marks')
            .select('*')
            .eq('user_id', user.id)
            .eq('year', currentYear) 
            .single(); 

        if (error) {
            setError('Error fetching marks: ' + error.message);
        } else if (data) {
            console.log('Fetched marks:', data); 
            setMathMarks(data.math_marks);
            setScienceMarks(data.science_marks);
            setEnglishMarks(data.english_marks);
            setSocialScienceMarks(data.social_science_marks);
            setHindiMarks(data.hindi_marks);
        } else {
            setError('No marks found for this user.');
        }

        setLoading(false); 
    };

    useEffect(() => {
        
        const fetchMarks = async () => {
            setLoading(true); 
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                console.error('Authentication error:', userError);
                setError('Not authenticated');
                setLoading(false);
                return;
            }

            console.log('Fetching marks for user ID:', user.id); 

            const { data, error } = await supabase
                .from('tenth_class_marks')
                .select('*')
                .eq('user_id', user.id)
                .eq('year', currentYear) 
                .limit(1) 
                .order('created_at', { ascending: false }); 

            if (error) {
                console.error('Error fetching marks:', error); 
                setError('Error fetching marks: ' + error.message);
            } else if (data && data.length > 0) {
                const fetchedData = data[0];
                setMathMarks(fetchedData.math_marks);
                setScienceMarks(fetchedData.science_marks);
                setEnglishMarks(fetchedData.english_marks);
                setSocialScienceMarks(fetchedData.social_science_marks);
                setHindiMarks(fetchedData.hindi_marks);
            } else {
                setError('No marks found for this user.');
            }

            setLoading(false); 
        };

        fetchMarks();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            setError('Not authenticated');
            setLoading(false);
            return;
        }

        const { error: upsertError } = await supabase
            .from('tenth_class_marks')
            .upsert({
                user_id: user.id,
                math_marks: mathMarks,
                science_marks: scienceMarks,
                english_marks: englishMarks,
                social_science_marks: socialScienceMarks,
                hindi_marks: hindiMarks,
                year: currentYear, 
            });

        if (upsertError) {
            setError('Error updating marks: ' + upsertError.message); 
            setLoading(false);

            return;
        }

        await fetchMarks(); 

        window.location.reload(); 
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen dark:bg-gray-900">
              <ClipLoader size={50} color={"#123abc"} loading={loading} />
            </div>
          );
            }

    return (
        <div className="flex items-center  justify-center h-52 w-72 bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white   dark:text-gray-900 p-6 rounded shadow-md">
                {error && <p className="text-red-500 mb-2">{error}</p>}

                <label>Maths Marks</label>
                <input
                    type="number"
                    value={mathMarks || ''}
                    onChange={(e) => setMathMarks(Number(e.target.value))}
                    placeholder="Math Marks"
                    className="border border-gray-300 p-2 mb-4 w-full"
                    required
                />

                <label>Science Marks</label>
                <input
                    type="number"
                    value={scienceMarks || ''}
                    onChange={(e) => setScienceMarks(Number(e.target.value))}
                    placeholder="Science Marks"
                    className="border border-gray-300 p-2 mb-4 w-full"
                    required
                />

                <label>English Marks</label>

                <input
                    type="number"
                    value={englishMarks || ''}
                    onChange={(e) => setEnglishMarks(Number(e.target.value))}
                    placeholder="English Marks"
                    className="border border-gray-300 p-2 mb-4 w-full"
                    required
                />

                <label>Social Science Marks</label>

                <input
                    type="number"
                    value={socialScienceMarks || ''}
                    onChange={(e) => setSocialScienceMarks(Number(e.target.value))}
                    placeholder="Social Science Marks"
                    className="border border-gray-300 p-2 mb-4 w-full"
                    required
                />
                <label>Hindi Marks</label>


                <input
                    type="number"
                    value={hindiMarks || ''}
                    onChange={(e) => setHindiMarks(Number(e.target.value))}
                    placeholder="Hindi Marks"
                    className="border border-gray-300 p-2 mb-4 w-full"
                    required
                />
                <button type="submit" className="bg-blue-500 text-white p-2 rounded w-full">
                    Update Marks
                </button>

            </form>
        </div>
    );
};

export default TenthClassForm;

