# Full Stack Interactive Dashboard with Next.js, Recharts, and Supabase

## Objective
This project is a full-stack interactive dashboard built using **Next.js**, **Recharts**, and **Supabase**. It provides real-time metrics, user authentication, and data visualization through a dynamic and responsive interface. The application allows users to manage their profiles and input academic data, which updates the dashboard in real-time. The dashboard is fully responsive and includes a dark mode feature for enhanced user experience.

## Features

### 1. **User Authentication**
- Implemented using **Supabase Auth**.
- Includes **Login** and **Signup** pages.
- Protected routes ensure only authenticated users can access the dashboard.

### 2. **Dashboard Implementation**
- A main dashboard page with multiple widgets.
- Visualized data using **Recharts** with 5 chart types:
  - Line Chart
  - Bar Chart
  - Pie Chart
  - Area Chart
  - Circular Progress Graph (for profile completion percentage)
- Real-time updates for one of the widgets to ensure a live data feed.

### 3. **Data Management**
- Backend data stored in **Supabase**.
- Users can:
  - Sign up and log in.
  - Update their profiles and academic details (10th and 12th-grade marks).
  - All updates are reflected dynamically on the charts.
  - Create and update marks tables.
- Form created to allow users to input new data, which updates the dashboard in real-time.

### 4. **Responsive Design**
- Fully responsive and optimized for mobile devices.
- **Collapsible sidebar** for navigation, with:
  - One section for user profile.
  - Another section displaying all users' data on the dashboard.

### 5. **Deployment**
- Project deployed on **Vercel** and live at: [Dashboard Live Link](https://dashboard-of-student.vercel.app/)
- **Dark Mode Toggle** implemented for the dashboard interface.
- **Server-Side Rendering (SSR)** for the initial load of the dashboard.

## Tech Stack

- **Next.js**: Framework for building the dashboard and handling server-side rendering.
- **Supabase**: Backend-as-a-Service for database and authentication.
- **Recharts**: Data visualization library for rendering interactive charts.
- **Tailwind CSS**: For responsive and modern UI design.
- **Vercel**: For deployment and hosting.

## Project Setup

### Prerequisites
- **Node.js**: Ensure you have Node.js installed (v14 or higher).
- **Supabase Account**: You will need a Supabase account for authentication and database services.

### Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/sanjeevpatel3007/dashboard.git
    cd dashboard-app
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Set up environment variables**:
   Create a `.env.local` file at the root of the project and add your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
    ```

4. **Run the development server**:
    ```bash
    npm run dev
    ```

5. **Open** [http://localhost:3000](http://localhost:3000) to view the application in the browser.

### Database Setup
- Sign in to **Supabase** and create a new project.
- Define tables and schemas needed for storing the dashboard data. You can use the SQL editor in Supabase to define:
  - `users` table
  - `tenth_class_marks` table
  - `twelfth_class_marks` table
 


##ScreenShot
![image](https://github.com/user-attachments/assets/288184f4-f1a0-4bd5-b317-1ffafb03eda6)




### Deployment
The project is deployed on **Vercel**. To deploy your own instance:

1. Connect the project to Vercel.
2. Set the required environment variables on Vercel (same as in your `.env.local` file).
3. Deploy directly from GitHub or your local environment.

## Challenges Faced
- **Real-time Updates**: Implementing real-time updates for dashboard widgets required careful optimization to maintain performance.
- **Responsive Design**: Ensuring a smooth user experience across different devices with a collapsible sidebar posed some design challenges.
- **Supabase Setup**: Setting up Supabase, especially with **Row Level Security (RLS)** policies, required thorough testing to ensure data safety and proper user access.

## Future Improvements
- Add more chart types for enhanced data visualization.
- Introduce multi-language support for international users.
- Implement notifications for significant updates or data changes.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

Developed by [Sanjeev Patel](https://github.com/sanjeevpatel3007)
