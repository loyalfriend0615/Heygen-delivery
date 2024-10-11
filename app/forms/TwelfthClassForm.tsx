"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import ClipLoader from "react-spinners/ClipLoader";
interface MarksState {
  math_marks: number | null;
  physics_marks: number | null;
  chemistry_marks: number | null;
  english_marks: number | null;
  hindi_marks: number | null;
}

const TwelfthClassForm = () => {
  const [marks, setMarks] = useState<MarksState>({
    math_marks: null,
    physics_marks: null,
    chemistry_marks: null,
    english_marks: null,
    hindi_marks: null,
  });
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

    const { data, error } = await supabase
      .from('twelfth_class_marks')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      setError('Error fetching marks: ' + error.message);
    } else if (data && data.length > 0) {
      console.log('Fetched marks:', data[0]);
      const fetchedData = data[0];
      setMarks({
        math_marks: fetchedData.math_marks,
        physics_marks: fetchedData.physics_marks,
        chemistry_marks: fetchedData.chemistry_marks,
        english_marks: fetchedData.english_marks,
        hindi_marks: fetchedData.hindi_marks,
      });
    } else {
      setError('No marks found for this user.');
    }

    setLoading(false);
  };

  useEffect(() => {
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
      .from('twelfth_class_marks')
      .upsert({
        user_id: user.id,
        math_marks: marks.math_marks,
        physics_marks: marks.physics_marks,
        chemistry_marks: marks.chemistry_marks,
        english_marks: marks.english_marks,
        hindi_marks: marks.hindi_marks,
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
    <div className="flex items-center justify-center h-72 w-72 bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6  dark:text-gray-900 rounded shadow-md">
        <h2 className="text-2xl mb-4">Update 12th Class Marks</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <label>Maths Marks</label>

        <input
          type="number"
          value={marks.math_marks ?? ''}
          onChange={(e) => setMarks({ ...marks, math_marks: Number(e.target.value) })}
          placeholder="Math Marks"
          className="border border-gray-300 p-2 mb-4 w-full"
          required
        />
        <label>Physics Marks</label>

        <input
          type="number"
          value={marks.physics_marks ?? ''}
          onChange={(e) => setMarks({ ...marks, physics_marks: Number(e.target.value) })}
          placeholder="Physics Marks"
          className="border border-gray-300 p-2 mb-4 w-full"
          required
        />
        <label>Chemistry Marks</label>

        <input
          type="number"
          value={marks.chemistry_marks ?? ''}
          onChange={(e) => setMarks({ ...marks, chemistry_marks: Number(e.target.value) })}
          placeholder="Chemistry Marks"
          className="border border-gray-300 p-2 mb-4 w-full"
          required
        />
        <label>English Marks</label>

        <input
          type="number"
          value={marks.english_marks ?? ''}
          onChange={(e) => setMarks({ ...marks, english_marks: Number(e.target.value) })}
          placeholder="English Marks"
          className="border border-gray-300 p-2 mb-4 w-full"
          required
        />
        <label>Hindi Marks</label>
        <input
          type="number"
          value={marks.hindi_marks ?? ''}
          onChange={(e) => setMarks({ ...marks, hindi_marks: Number(e.target.value) })}
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

export default TwelfthClassForm;
