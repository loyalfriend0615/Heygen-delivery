"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    AreaChart,
    Area,
} from "recharts";

const UsersPage = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [tenthCount, setTenthCount] = useState(0);
    const [twelfthCount, setTwelfthCount] = useState(0);
    const [tenthFailCount, setTenthFailCount] = useState(0);
    const [twelfthFailCount, setTwelfthFailCount] = useState(0);
    const [tenthSubjectAverages, setTenthSubjectAverages] = useState({
        hindi: 0,
        math: 0,
        science: 0,
        english: 0,
        social: 0,
    });
    const [twelfthSubjectAverages, setTwelfthSubjectAverages] = useState({
        hindi: 0,
        math: 0,
        science: 0,
        english: 0,
        social: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from("users")
                .select("*");

            if (error) throw error;

            setUsers(data);
            console.log("All Users Data:", data);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setError("Error fetching users: " + error.message);
                console.error("Error fetching users: ", error);
            } else {
                setError("An unknown error occurred.");
                console.error("An unknown error occurred:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentCountsAndAverages = async () => {
        try {
            const { data: tenthClassData, error: tenthError } = await supabase
                .from("tenth_class_marks")
                .select("*");

            if (tenthError) throw tenthError;

            const tenthStudentCount = tenthClassData.length;
            setTenthCount(tenthStudentCount);

            const tenthSubjectSums = {
                hindi: 0,
                math: 0,
                science: 0,
                english: 0,
                social: 0,
            };
            let failCount = 0;

            tenthClassData.forEach((student) => {
                tenthSubjectSums.hindi += student.hindi_marks || 0;
                tenthSubjectSums.math += student.math_marks || 0;
                tenthSubjectSums.science += student.science_marks || 0;
                tenthSubjectSums.english += student.english_marks || 0;
                tenthSubjectSums.social += student.social_science_marks || 0;

                if (
                    student.hindi_marks < 33 ||
                    student.math_marks < 33 ||
                    student.science_marks < 33 ||
                    student.english_marks < 33 ||
                    student.social_science_marks < 33
                ) {
                    failCount++;
                }
            });

            const tenthAverages = {
                hindi: (tenthSubjectSums.hindi / tenthStudentCount) || 0,
                math: (tenthSubjectSums.math / tenthStudentCount) || 0,
                science: (tenthSubjectSums.science / tenthStudentCount) || 0,
                english: (tenthSubjectSums.english / tenthStudentCount) || 0,
                social: (tenthSubjectSums.social / tenthStudentCount) || 0,
            };

            setTenthSubjectAverages(tenthAverages);
            setTenthFailCount(failCount);

            const { data: twelfthClassData, error: twelfthError } = await supabase
                .from("twelfth_class_marks")
                .select("*");

            if (twelfthError) throw twelfthError;

            const twelfthStudentCount = twelfthClassData.length;
            setTwelfthCount(twelfthStudentCount);

            const twelfthSubjectSums = {
                hindi: 0,
                math: 0,
                science: 0,
                english: 0,
                social: 0,
            };
            let twelfthFailCount = 0;

            twelfthClassData.forEach((student) => {
                twelfthSubjectSums.hindi += student.hindi_marks || 0;
                twelfthSubjectSums.math += student.math_marks || 0;
                twelfthSubjectSums.science += student.chemistry_marks || 0;
                twelfthSubjectSums.english += student.english_marks || 0;
                twelfthSubjectSums.social += student.physics_marks || 0;

                if (
                    student.hindi_marks < 33 ||
                    student.math_marks < 33 ||
                    student.science_marks < 33 ||
                    student.english_marks < 33 ||
                    student.social_science_marks < 33
                ) {
                    twelfthFailCount++;
                }
            });

            const twelfthAverages = {
                hindi: (twelfthSubjectSums.hindi / twelfthStudentCount) || 0,
                math: (twelfthSubjectSums.math / twelfthStudentCount) || 0,
                science: (twelfthSubjectSums.science / twelfthStudentCount) || 0,
                english: (twelfthSubjectSums.english / twelfthStudentCount) || 0,
                social: (twelfthSubjectSums.social / twelfthStudentCount) || 0,
            };

            setTwelfthSubjectAverages(twelfthAverages);
            setTwelfthFailCount(twelfthFailCount);

        } catch (error: unknown) {
            if (error instanceof Error) {
                setError("Error fetching student counts and averages: " + error.message);
                console.error("Error fetching student counts and averages: ", error);
            } else {
                setError("An unknown error occurred.");
                console.error("An unknown error occurred:", error);
            }
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchStudentCountsAndAverages();
    }, []);

    if (loading) {
        return <div className="text-center">Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    const pieDataTenth = [
        { name: "Passed", value: tenthCount - tenthFailCount },
        { name: "Failed", value: tenthFailCount },
    ];

    const pieDataTwelfth = [
        { name: "Passed", value: twelfthCount - twelfthFailCount },
        { name: "Failed", value: twelfthFailCount },
    ];

    const barDataTenth = [
        { subject: "Hindi", average: tenthSubjectAverages.hindi },
        { subject: "Math", average: tenthSubjectAverages.math },
        { subject: "Science", average: tenthSubjectAverages.science },
        { subject: "English", average: tenthSubjectAverages.english },
        { subject: "Social Science", average: tenthSubjectAverages.social },
    ];

    const barDataTwelfth = [
        { subject: "Hindi", average: twelfthSubjectAverages.hindi },
        { subject: "Math", average: twelfthSubjectAverages.math },
        { subject: "Science", average: twelfthSubjectAverages.science },
        { subject: "English", average: twelfthSubjectAverages.english },
        { subject: "Social Science", average: twelfthSubjectAverages.social },
    ];

    const areaChartData = [
        {
            subject: "Hindi",
            "10th": tenthSubjectAverages.hindi,
            "12th": twelfthSubjectAverages.hindi,
        },
        {
            subject: "Math",
            "10th": tenthSubjectAverages.math,
            "12th": twelfthSubjectAverages.math,
        },
        {
            subject: "Science",
            "10th": tenthSubjectAverages.science,
            "12th": twelfthSubjectAverages.science,
        },
        {
            subject: "English",
            "10th": tenthSubjectAverages.english,
            "12th": twelfthSubjectAverages.english,
        },
        {
            subject: "Social Science",
            "10th": tenthSubjectAverages.social,
            "12th": twelfthSubjectAverages.social,
        },
    ];

    return (
        <div className="max-w-4xl mx-auto p-4 bg-white dark:bg-gray-800  dark:text-white shadow-lg rounded-lg mt-8">


        <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">All Users</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 dark:bg-gray-800  dark:text-white mt-4">
            <div className="shadow-md rounded-lg p-4 dark:bg-gray-900  dark:text-white bg-white">
                <h2 className="text-xl font-semibold mb-2">10th Class Pass/Fail Distribution</h2>
                <PieChart width={300} height={300}>
                    <Pie
                        data={pieDataTenth}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        fill="#8884d8"
                        label
                    >
                        {pieDataTenth.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? "#4caf50" : "#f44336"} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </div>
            <div className="shadow-md rounded-lg p-4 dark:bg-gray-900  dark:text-white bg-white">
                <h2 className="text-xl font-semibold mb-2">12th Class Pass/Fail Distribution</h2>
                <PieChart width={300} height={300}>
                    <Pie
                        data={pieDataTwelfth}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        fill="#8884d8"
                        label
                    >
                        {pieDataTwelfth.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? "#4caf50" : "#f44336"} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </div>
        </div>
    
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="shadow-md rounded-lg p-4 dark:bg-gray-900  dark:text-white bg-white">
                <h2 className="text-xl font-semibold mb-2">10th Class Average Marks</h2>
                <BarChart width={300} height={200} data={barDataTenth} className="w-full">
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#8884d8" />
                </BarChart>
            </div>
            <div className="shadow-md rounded-lg p-4 dark:bg-gray-900  dark:text-white bg-white">
                <h2 className="text-xl font-semibold mb-2">12th Class Average Marks</h2>
                <BarChart width={300} height={200} data={barDataTwelfth} className="w-full">
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#8884d8" />
                </BarChart>
            </div>
        </div>
    
        <div className="shadow-md rounded-lg p-4 w-full dark:bg-gray-900  dark:text-white bg-white mt-4">
            <h2 className="text-xl font-semibold mb-2">Comparison of Average Marks</h2>
            <AreaChart
                width={300} 
                height={200} 
                data={areaChartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="10th" stroke="#4caf50" fillOpacity={0.3} fill="#4caf50" />
                <Area type="monotone" dataKey="12th" stroke="#f44336" fillOpacity={0.3} fill="#f44336" />
            </AreaChart>
        </div>
    </div>
    
    </div>
    );
};

export default UsersPage;
