"use client";
import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalReg: 0 });

  // 1. Fetch Admin Stats from your Backend
  useEffect(() => {
    // We will connect this to your node server.js later
    // For now, these are placeholders to show the UI
    setStats({ totalEvents: 12, totalReg: 450 });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400">Club Admin Portal</h1>
          <p className="text-slate-400">Manage your events and track student participation.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold transition">
          + Create New Event
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <p className="text-slate-400 text-sm uppercase font-bold">Total Events</p>
          <h2 className="text-4xl font-bold mt-2">{stats.totalEvents}</h2>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <p className="text-slate-400 text-sm uppercase font-bold">Total Registrations</p>
          <h2 className="text-4xl font-bold mt-2 text-emerald-400">{stats.totalReg}</h2>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <p className="text-slate-400 text-sm uppercase font-bold">Pending OD Approvals</p>
          <h2 className="text-4xl font-bold mt-2 text-orange-400">24</h2>
        </div>
      </div>

      {/* Management Tabs */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="flex border-b border-slate-700">
          <button className="px-8 py-4 bg-slate-700 text-emerald-400 font-bold border-b-2 border-emerald-400">
            Active Events
          </button>
          <button className="px-8 py-4 text-slate-400 hover:bg-slate-700 transition">
            Student List
          </button>
          <button className="px-8 py-4 text-slate-400 hover:bg-slate-700 transition">
            OD Logs
          </button>
        </div>

        {/* Placeholder for Event Table */}
        <div className="p-6">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="pb-4">Event Name</th>
                <th className="pb-4">Date</th>
                <th className="pb-4">Registrations</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              <tr className="hover:bg-slate-700/30 transition">
                <td className="py-4 font-semibold">Hackathon 2026</td>
                <td className="py-4 text-slate-300">April 12, 2026</td>
                <td className="py-4 text-emerald-400">128 Students</td>
                <td className="py-4"><span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold uppercase">Live</span></td>
                <td className="py-4 text-slate-400 cursor-pointer hover:text-white">Edit | View List</td>
              </tr>
              {/* More rows would be mapped here from MongoDB */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}