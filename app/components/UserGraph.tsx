"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import TenthClassForm from '../forms/TenthClassForm';
import TwelfthClassForm from '../forms/TwelfthClassForm';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const UserGraph: React.FC = () => {
  const [isTenthClassFormOpen, setTenthClassFormOpen] = useState(false);
  const [isTwelfthClassFormOpen, setTwelfthClassFormOpen] = useState(false);

  const [tenthMarks, setTenthMarks] = useState({
    math: null,
    science: null,
    english: null,
    socialScience: null,
    hindi: null,
  });
  const [twelfthMarks, setTwelfthMarks] = useState({
    math: null,
    physics: null,
    chemistry: null,
    english: null,
    hindi: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch 10th class marks
  const fetchTenthMarks = async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tenth_class_marks")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .order("created_at", { ascending: false });

    if (error) {
      setError("Error fetching 10th marks: " + error.message);
    } else if (data && data.length > 0) {
      const fetchedData = data[0];
      setTenthMarks({
        math: fetchedData.math_marks,
        science: fetchedData.science_marks,
        english: fetchedData.english_marks,
        socialScience: fetchedData.social_science_marks,
        hindi: fetchedData.hindi_marks,
      });
    } else {
      setError("No 10th marks found for this user.");
    }

    setLoading(false);
  };

  // Fetch 12th class marks
  const fetchTwelfthMarks = async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("twelfth_class_marks")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .order("created_at", { ascending: false });

    if (error) {
      setError("Error fetching 12th marks: " + error.message);
    } else if (data && data.length > 0) {
      const fetchedData = data[0];
      setTwelfthMarks({
        math: fetchedData.math_marks,
        physics: fetchedData.physics_marks,
        chemistry: fetchedData.chemistry_marks,
        english: fetchedData.english_marks,
        hindi: fetchedData.hindi_marks,
      });
    } else {
      setError("No 12th marks found for this user.");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTenthMarks();
    fetchTwelfthMarks();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  // Prepare data for the charts
  const tenthData = [
    {
      subject: "Math",
      tenth: tenthMarks.math || 0,
    },
    {
      subject: "Science",
      tenth: tenthMarks.science || 0,
    },
    {
      subject: "English",
      tenth: tenthMarks.english || 0,
    },
    {
      subject: "Social Science",
      tenth: tenthMarks.socialScience || 0,
    },
    {
      subject: "Hindi",
      tenth: tenthMarks.hindi || 0,
    },

  ]
  const twelfthData = [

    {
      subject: "Math",
      twelfth: twelfthMarks.math || 0,
    },

    {
      subject: "English",
      twelfth: twelfthMarks.english || 0,
    },

    {
      subject: "Hindi",
      twelfth: twelfthMarks.hindi || 0,
    },
    {
      subject: "Phyisce",
      twelfth: twelfthMarks.physics || 0,
    },
    {
      subject: "Chemistry",
      twelfth: twelfthMarks.chemistry || 0,
    },

  ]

  const marksData = [
    {
      subject: "Math",
      tenth: tenthMarks.math || 0,
      twelfth: twelfthMarks.math || 0,
    },
    {
      subject: "Science",
      tenth: tenthMarks.science || 0,
      twelfth: twelfthMarks.physics || 0,
    },
    {
      subject: "English",
      tenth: tenthMarks.english || 0,
      twelfth: twelfthMarks.english || 0,
    },
    {
      subject: "Social Science",
      tenth: tenthMarks.socialScience || 0,
      twelfth: 0, // No Social Science in 12th class
    },
    {
      subject: "Hindi",
      tenth: tenthMarks.hindi || 0,
      twelfth: twelfthMarks.hindi || 0,
    },
    {
      subject: "Phyisce",
      tenth: 0,
      twelfth: twelfthMarks.physics || 0,
    },
    {
      subject: "Chemistry",
      tenth: 0,
      twelfth: twelfthMarks.chemistry || 0,
    },
  ];


  const CustomTick = (props: any) => {
    const { x, y, payload } = props;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="end" 
          fill="#666"
          transform="rotate(-25)" 
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col dark:bg-gray-800  dark:text-white">

      <h3 className="text-xl font-semibold mb-2">Marks Comparison</h3>

      <div className="flex md:flex-row dark:bg-gray-900 rounded-lg p-4  dark:text-white flex-col mb-4">
        {/* Bar Chart for 10th Marks */}
        <div className="h-64 w-full md:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tenthData}>
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tenth" fill="#8884d8" name="10th Marks" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart for 12th Marks */}
        <div className="h-64 w-full dark:bg-gray-900 rounded-lg p-4 md:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={twelfthData}>
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="twelfth" fill="#82ca9d" name="12th Marks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart for Comparing 10th and 12th Marks */}
      <div className="h-64 dark:bg-gray-900 rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={marksData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="subject"
              tick={<CustomTick />} 
              interval={0}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="tenth" stroke="#8884d8" name="10th Marks" />
            <Line type="monotone" dataKey="twelfth" stroke="#82ca9d" name="12th Marks" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        {/* Buttons to open forms 10th  */}
        <div className="flex flex-col md:flex-row dark:bg-gray-800  dark:text-white justify-center al mt-4">
          <button
            onClick={() => setTenthClassFormOpen(true)}
            className="bg-blue-500 text-white py-2 px-4 mt-2  rounded mr-2"
          >
            Edit 10th class marks
          </button>
          <button
            onClick={() => setTwelfthClassFormOpen(true)}
            className="bg-blue-500 text-white py-2 px-4 mt-2 rounded"
          >
            Edit 12th class marks
          </button>
        </div>

        {isTenthClassFormOpen && (
          <div className="fixed -inset-full  bg-gray-600 bg-opacity-50 flex justify-center items-center">
            <div className="relative   dark:text-gray-800 bg-white py-6 mt-96 rounded-lg shadow-lg w-72  ">
              <div className="flex justify-between  dark:text-gray-800 items-center">
                <h2 className="text-2xl font-bold">Tenth Class Update Marks</h2>
                <button
                  onClick={() => setTenthClassFormOpen(false)}
                  className="bg-red-500 text-white rounded px-4 py-2"
                >
                  Close
                </button>
              </div>

              {/* TenthClassForm component at the bottom */}
              <div className="mt-36">
                <TenthClassForm />
              </div>
            </div>
          </div>
        )}


        {isTwelfthClassFormOpen && (
          <div className="fixed -inset-full bg-gray-600 bg-opacity-50 flex justify-center items-center">
            <div className="relative bg-white py-6 dark:text-gray-800 rounded-lg mt-96 shadow-lg w-72">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Twelfth Class Update Marks</h2>
                <button
                  onClick={() => setTwelfthClassFormOpen(false)}
                  className="bg-red-500 text-white rounded px-4 py-2"
                >
                  Close
                </button>
              </div>

              {/* TwelfthClassForm component at the bottom */}
              <div className="mt-36">
                <TwelfthClassForm />
              </div>
            </div>
          </div>
        )}



      </div>

    </div>
  );
};

export default UserGraph;
