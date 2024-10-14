"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import AllUsers from './components/AllUsers';
import Profile from "./components/Profile";
import DarkModeToggle from './DarkModeToggle';
import ClipLoader from 'react-spinners/ClipLoader';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeComponent, setActiveComponent] = useState<'profile' | 'allUsers'>('profile');
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
      } else {
        setUser(user);
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      router.push('/login');
    }
  };

  const toggleComponent = (component: 'profile' | 'allUsers') => {
    if (component !== activeComponent) {
      setDirection(component === 'profile' ? 'right' : 'left');
      setActiveComponent(component);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen dark:bg-gray-900">
        <ClipLoader size={50} color={"#123abc"} loading={isLoading} />
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-4xl  mx-auto dark:bg-gray-900 dark:text-white h-screen overflow-x-hidden   overflow-y-scroll scrollbar-hide">
   

      <div className="flex  justify-between dark:bg-gray-800 dark:text-white items-center p-3 bg-white shadow mb-6">
        <h1 className="text-2xl font-bold">Welcome to your Dashboard</h1>
        <div className='flex'>
          <div>
            <DarkModeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 mb-4 flex w-full bg-white dark:bg-gray-800 shadow">
        <button
          onClick={() => toggleComponent('profile')}
          className={`w-1/2 py-2 rounded-l-lg ${activeComponent === 'profile'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-600 dark:text-white'
            }`}
        >
          Profile
        </button>
        <button
          onClick={() => toggleComponent('allUsers')}
          className={`w-1/2 py-2 rounded-r-lg ${activeComponent === 'allUsers'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-600 dark:text-white'
            }`}
        >
          All Users
        </button>
      </div>


      <div className="flex-grow   relative">
        <div className={`absolute  w-full h-full transition-all duration-1000 ease-in-out transform ${activeComponent === 'profile' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
          }`}>
          <Profile />
        </div>
        <div className={`absolute w-full h-full transition-all duration-1000 ease-in-out transform ${activeComponent === 'allUsers' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}>
          <AllUsers />
        </div>
      </div>
    </div>
  );
}
