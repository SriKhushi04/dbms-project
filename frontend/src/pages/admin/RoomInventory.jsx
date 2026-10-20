import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { DoorOpen, CheckCircle2, AlertCircle, Filter, Building } from 'lucide-react';

export default function RoomInventory() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    loadRooms();
  }, [selectedBlock, selectedCapacity]);

  const loadRooms = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBlock) params.append('block_id', selectedBlock);
      if (selectedCapacity) params.append('capacity', selectedCapacity);

      const res = await api.get(`/rooms?${params.toString()}`);
      if (res.data.success) {
        setRooms(res.data.rooms);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(r => {
    if (selectedStatus && r.occupancy_status !== selectedStatus) return false;
    return true;
  });

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading room inventory from MySQL...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Physical Room Inventory</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Strict Inventory: 80 physical rooms (20 single, 30 double, 30 quad) = 200 beds across Blocks A, B, and C.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm">
            Total Showing: {filteredRooms.length} / 80 Rooms
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Filters:</span>
        </div>

        <select
          value={selectedBlock}
          onChange={(e) => setSelectedBlock(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
        >
          <option value="">All Blocks</option>
          <option value="1">Block A (Boys)</option>
          <option value="2">Block B (Girls)</option>
          <option value="3">Block C (Co-ed)</option>
        </select>

        <select
          value={selectedCapacity}
          onChange={(e) => setSelectedCapacity(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
        >
          <option value="">All Capacities</option>
          <option value="1">Single Rooms (1 Bed)</option>
          <option value="2">Double Rooms (2 Beds)</option>
          <option value="4">Quad Rooms (4 Beds)</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="OCCUPIED">Occupied</option>
        </select>

        {(selectedBlock || selectedCapacity || selectedStatus) && (
          <button
            onClick={() => { setSelectedBlock(''); setSelectedCapacity(''); setSelectedStatus(''); }}
            className="text-xs text-indigo-600 hover:underline font-bold ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredRooms.map((r) => {
          const isOccupied = r.occupancy_status === 'OCCUPIED';
          return (
            <div
              key={r.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                isOccupied
                  ? 'bg-slate-50 border-slate-200 opacity-90'
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-black text-slate-900 text-lg block">
                      {r.room_number}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                      {r.block_name} • Floor {r.floor}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    isOccupied ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {r.occupancy_status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{r.room_type}</span>
                  <span className="font-extrabold text-slate-900">{r.capacity} Bed{r.capacity > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Occupants:</span>
                <span className="font-bold text-slate-700">{r.current_occupants_count} / {r.capacity}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

