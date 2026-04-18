import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public pages
import Home       from "./pages/Home";
import Auth       from "./pages/Auth";
import Dashboard  from "./pages/Dashboard";
import Clubs      from "./pages/Clubs";
import ClubDetail from "./pages/ClubDetail";
import NotFound   from "./pages/NotFound";

// Shared
import ChangePassword      from "./pages/ChangePassword";
import CertificateVerify   from "./pages/CertificateVerify";
import StudentCertificates from "./pages/student/Certificates";

// Club admin
import ClubLayout    from "./components/club/ClubLayout";
import ClubDashboard from "./pages/club/Dashboard";
import ClubProfile   from "./pages/club/Profile";
import ClubEvents    from "./pages/club/Events";
import CreateEvent   from "./pages/club/CreateEvent";
import PastEvents    from "./pages/club/PastEvents";
import AddPastEvent  from "./pages/club/AddPastEvent";
import Scanner       from "./pages/club/Scanner";
import EventDetail   from "./pages/club/EventDetail";

// Super admin
import AdminLayout      from "./components/admin/AdminLayout";
import AdminDashboard   from "./pages/admin/Dashboard";
import PendingApprovals from "./pages/admin/PendingApprovals";
import AllEvents        from "./pages/admin/AllEvents";
import AllClubs         from "./pages/admin/AllClubs";
import AllStudents      from "./pages/admin/AllStudents";
import Institutes       from "./pages/admin/Institutes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"          element={<Home />} />
          <Route path="/auth"      element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clubs"     element={<Clubs />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />

          {/* Shared — no layout wrapper */}
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/certificates"    element={<StudentCertificates />} />
          <Route path="/verify/:certId"  element={<CertificateVerify />} />

          {/* Club admin — auth guard inside ClubLayout */}
          <Route path="/club" element={<ClubLayout />}>
            <Route path="dashboard"       element={<ClubDashboard />} />
            <Route path="profile"         element={<ClubProfile />} />
            <Route path="events"          element={<ClubEvents />} />
            <Route path="events/create"   element={<CreateEvent />} />
            <Route path="events/past"     element={<PastEvents />} />
            <Route path="events/add-past" element={<AddPastEvent />} />
            <Route path="events/:id"      element={<EventDetail />} />
            <Route path="scanner"         element={<Scanner />} />
          </Route>

          {/* Super admin — auth guard inside AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard"  element={<AdminDashboard />} />
            <Route path="approvals"  element={<PendingApprovals />} />
            <Route path="events"     element={<AllEvents />} />
            <Route path="clubs"      element={<AllClubs />} />
            <Route path="students"   element={<AllStudents />} />
            <Route path="institutes" element={<Institutes />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
