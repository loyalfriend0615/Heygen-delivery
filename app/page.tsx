"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import DarkModeToggle from './DarkModeToggle';
import ClipLoader from 'react-spinners/ClipLoader';
import AvatarVideoStream from './components/AvatarVideoStream';
import { MessageSquare, LogOut } from 'lucide-react';

export default function Dashboard() {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchAvatars = async () => {
      // Check authentication
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      // Fetch avatars
      const { data, error: avatarError } = await supabase
        .from('avatars')
        .select('avatar_id, avatar_name, avatar_preview_image_url, idle_video_path, to_live_video_path, to_idle_video_path');
      if (avatarError) {
        setAvatars([]);
      } else {
        setAvatars(data || []);
      }
      setIsLoading(false);
    };
    fetchAvatars();
  }, [router, supabase]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      router.push('/login');
    }
  };

  // Handle chat with avatar
  const handleChat = (avatar_id: string) => {
    setSelectedAvatar(avatar_id);
  };

  const handleMenu = (avatar_id: string) => {
    alert(`Menu for avatar: ${avatar_id}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen dark:bg-gray-900">
        <ClipLoader size={50} color={"#123abc"} loading={isLoading} />
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-6xl mx-auto dark:bg-gray-900 dark:text-white h-screen overflow-x-hidden overflow-y-scroll scrollbar-hide">
      <div className="flex justify-between dark:bg-gray-800 dark:text-white items-center p-3 bg-white shadow mb-6">
        <h1 className="text-2xl font-bold">Avatars Gallery</h1>
        <div className='flex'>
          <div>
            <DarkModeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white py-2 px-4 rounded ml-2 flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
        {avatars.length === 0 && (
          <div className="col-span-full text-center text-gray-500">No avatars found.</div>
        )}
        {avatars.map((avatar) => (
          <div
            key={avatar.avatar_id}
            className="relative bg-gray-900 rounded-xl shadow overflow-hidden group flex flex-col justify-end min-h-[220px] h-64"
          >
            {/* 3-dots menu button */}
            <button
              onClick={() => handleMenu(avatar.avatar_id)}
              className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 focus:outline-none"
              title="More options"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {/* Avatar image */}
            <img
              src={avatar.avatar_preview_image_url}
              alt={avatar.avatar_name}
              className="absolute top-0 left-0 w-full h-full object-cover object-center z-0 group-hover:opacity-80 transition-opacity duration-200"
            />
            {/* Overlay for name */}
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-black/0 px-4 py-3 z-10">
              <span className="text-white text-lg font-semibold drop-shadow-lg">{avatar.avatar_name}</span>
            </div>
            {/* Chat button (centered, visible on hover) */}
            <button
              onClick={() => handleChat(avatar.avatar_id)}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <MessageSquare className="inline-block mr-2 w-5 h-5" />
              Chat
            </button>
          </div>
        ))}
      </div>

      {/* Avatar Video Stream Modal */}
      {selectedAvatar && (
        <AvatarVideoStream
          avatarName={selectedAvatar}
          idleVideoUrl={avatars.find(a => a.avatar_id === selectedAvatar)?.idle_video_path || ''}
          toLiveVideoUrl={avatars.find(a => a.avatar_id === selectedAvatar)?.to_live_video_path || ''}
          toIdleVideoUrl={avatars.find(a => a.avatar_id === selectedAvatar)?.to_idle_video_path || ''}
          onClose={() => setSelectedAvatar(null)}
        />
      )}
    </div>
  );
}
