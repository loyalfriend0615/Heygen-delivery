"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import UserGraph from "./UserGraph";

const ProfilePage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [age, setAge] = useState<number | null>(null);
  const [location, setLocation] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const router = useRouter();

  // Fetch user profile
  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    // Fetch user's profile
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("name, email, created_at, last_login, age, location")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setError("Error fetching profile: " + profileError.message);
    } else {
      setProfile(userData);
      // Set initial values for the form
      setName(userData.name || "");
      setAge(userData.age || null);
      setLocation(userData.location || "");
    }

    setLoading(false);
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Not authenticated");
      return;
    }
    const updates: { name?: string; age?: number; location?: string } = {};
    if (name) updates.name = name;
    if (age !== null) updates.age = age;
    if (location) updates.location = location;

    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id);

    if (updateError) {
      setError("Error updating profile: " + updateError.message);
    } else {
      await fetchProfile();
      setIsEditing(false); 
    }
  };

  const calculateProfileCompleteness = () => {
    if (!profile) {
      return 0; 
    }

    let completeness = 0;

    if (profile.name) completeness += 20;
    if (profile.age) completeness += 20;
    if (profile.location) completeness += 20;
    if (profile.email) completeness += 20;
    if (profile.created_at) completeness += 20;

    return completeness;
  };

  const profileCompleteness = calculateProfileCompleteness();

  const data = [
    { name: "Completed", value: profileCompleteness },
    { name: "Not Completed", value: 100 - profileCompleteness },
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return <div className="text-center text-lg">Loading profile...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!profile) {
    return <div>No profile data found.</div>;
  }

  return (
    <div className="max-w-4xl dark:bg-gray-800  dark:text-white mx-auto p-4 bg-white shadow-lg rounded-lg mt-8">
     
     <div className="flex flex-col md:flex-row">
        <div className="flex-1 mb-4 md:mr-4">
          <h1 className="text-3xl font-bold mb-6 text-center">Profile</h1>
          <div className="flex flex-col sm:items-center mb-4">
            <div>
              <p className="text-lg"><strong>Name:</strong> {profile.name}</p>
              <p className="text-lg"><strong>Email:</strong> {profile.email}</p>
              <p className="text-lg"><strong>Age:</strong> {profile.age}</p>
              <p className="text-lg"><strong>Location:</strong> {profile.location}</p>
              <p className="text-lg"><strong>Account Created:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
              <p className="text-lg"><strong>Last Login:</strong> {new Date(profile.last_login).toLocaleString()}</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-blue-500 text-white p-2 px-5 rounded mt-8 transition duration-200 hover:bg-blue-600"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>

          {isEditing && (
            <form onSubmit={handleProfileUpdate} className="mt-4 dark:bg-gray-800  dark:text-white">
              <div className="mb-4">
                <label className="block mb-1 font-semibold">Name:</label>
                <input
                  type="text"
                  placeholder="Sanjeev"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-semibold">Age:</label>
                <input
                  type="number"
                  placeholder="25"
                  value={age || ""}
                  onChange={(e) => setAge(e.target.value ? Number(e.target.value) : null)}
                  className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-semibold">Location:</label>
                <input
                  type="text"
                  placeholder="Delhi, India"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button type="submit" className="bg-blue-500 text-white mt-2 p-2 rounded-lg transition duration-200 hover:bg-blue-600">
                Update Profile
              </button>
            </form>
          )}
        </div>

        <div className="flex-1 mb-4">
          <h2 className="text-2xl mb-8 text-center">Profile Completeness</h2>
          <div className="flex justify-center">
            <PieChart width={300} height={300}>
              <Pie
                data={data}
                cx={150}
                cy={100}
                innerRadius={60}
                outerRadius={90}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? "#82ca9d" : "#f56969"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        </div>
      </div>

     <UserGraph/>


    </div>
  );
};

export default ProfilePage;
