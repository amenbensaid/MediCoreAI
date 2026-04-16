import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import api from '../services/api';

const Calendar = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('month');

    useEffect(() => {
        fetchAppointments();
    }, [currentMonth]);

    const fetchAppointments = async () => {
        try {
            const start = startOfMonth(currentMonth).toISOString();
            const end = endOfMonth(currentMonth).toISOString();
            const response = await api.get('/appointments/calendar', { params: { start, end } });
            setAppointments(response.data.data);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: enUS })}
                </h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setCurrentMonth(new Date())} className="btn-secondary text-sm">Today</button>
                <div className="flex bg-gray-100 dark:bg-dark-700 rounded-xl p-1">
                    {['month', 'week'].map(v => (
                        <button key={v} onClick={() => setView(v)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-white dark:bg-dark-800 shadow' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                            {v === 'month' ? 'Month' : 'Week'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderDays = () => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map(day => (
                    <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const formattedDate = format(day, 'd');
                const cloneDay = day;
                const dayAppointments = appointments.filter(apt =>
                    isSameDay(new Date(apt.start), cloneDay)
                );

                days.push(
                    <div
                        key={day.toString()}
                        onClick={() => setSelectedDate(cloneDay)}
                        className={`min-h-[120px] p-2 border-b border-r border-gray-100 dark:border-dark-700 cursor-pointer transition-colors
              ${!isSameMonth(day, monthStart) ? 'bg-gray-50 dark:bg-dark-900/50' : 'bg-white dark:bg-dark-800'}
              ${isSameDay(day, selectedDate) ? 'ring-2 ring-primary-500 ring-inset' : ''}
              hover:bg-gray-50 dark:hover:bg-dark-700/50`}
                    >
                        <div className={`text-sm font-medium mb-1 ${isSameDay(day, new Date())
                                ? 'w-7 h-7 bg-primary-500 text-white rounded-full flex items-center justify-center'
                                : !isSameMonth(day, monthStart)
                                    ? 'text-gray-400'
                                    : 'text-gray-900 dark:text-white'
                            }`}>
                            {formattedDate}
                        </div>
                        <div className="space-y-1">
                            {dayAppointments.slice(0, 3).map(apt => (
                                <div key={apt.id}
                                    className="text-xs p-1 rounded truncate"
                                    style={{ backgroundColor: apt.color + '20', color: apt.color }}>
                                    {format(new Date(apt.start), 'HH:mm')} {apt.patientName?.split(' ')[0]}
                                </div>
                            ))}
                            {dayAppointments.length > 3 && (
                                <div className="text-xs text-gray-500">+{dayAppointments.length - 3} more</div>
                            )}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(<div key={day.toString()} className="grid grid-cols-7">{days}</div>);
            days = [];
        }
        return <div className="border-l border-t border-gray-100 dark:border-dark-700 rounded-xl overflow-hidden">{rows}</div>;
    };

    const selectedDayAppointments = appointments.filter(apt =>
        isSameDay(new Date(apt.start), selectedDate)
    );

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar */}
                <div className="flex-1 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                    {renderHeader()}
                    {loading ? (
                        <div className="flex items-center justify-center h-96"><div className="spinner" /></div>
                    ) : (
                        <>
                            {renderDays()}
                            {renderCells()}
                        </>
                    )}
                </div>

                {/* Selected Day Panel */}
                <div className="lg:w-80 bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {format(selectedDate, 'EEEE, MMMM d', { locale: enUS })}
                    </h3>
                    {selectedDayAppointments.length > 0 ? (
                        <div className="space-y-3">
                            {selectedDayAppointments.map(apt => (
                                <div key={apt.id} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-lg font-semibold text-primary-500">
                                            {format(new Date(apt.start), 'HH:mm')}
                                        </span>
                                        <span className={`badge ${apt.status === 'confirmed' ? 'badge-success' : 'badge-info'}`}>
                                            {apt.status}
                                        </span>
                                    </div>
                                    <p className="font-medium text-gray-900 dark:text-white">{apt.patientName}</p>
                                    <p className="text-sm text-gray-500">{apt.type}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400">No appointments this day</p>
                        </div>
                    )}
                    <button className="w-full btn-primary mt-4">
                        + Add Appointment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
