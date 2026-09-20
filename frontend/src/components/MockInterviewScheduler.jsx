import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, Video, X } from 'lucide-react'
import { api } from '../lib/api'

const INTERVIEW_TYPES = [
  { key: 'technical', label: 'Technical' },
  { key: 'behavioral', label: 'HR / Behavioral' },
  { key: 'both', label: 'Both' },
]

const TYPE_LABELS = Object.fromEntries(INTERVIEW_TYPES.map((t) => [t.key, t.label]))

const STATUS_STYLES = {
  scheduled: { label: 'Pending', className: 'bg-amber-50 text-amber-600' },
  completed: { label: 'Done', className: 'bg-emerald-50 text-emerald-600' },
}

const formatBookingDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = (first.getDay() + 6) % 7

  const cells = Array(leadingBlanks).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const sameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const MONTH_LABEL = (d) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
const toISODate = (d) => d.toISOString().slice(0, 10) // YYYY-MM-DD

// "14:05:09" or "14:05" → "2:05:09 PM" / "2:05 PM"
function formatClock(hms) {
  const [h, m, s] = hms.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  const mm = String(m).padStart(2, '0')
  return s ? `${h12}:${mm}:${String(s).padStart(2, '0')} ${period}` : `${h12}:${mm} ${period}`
}

export default function MockInterviewScheduler() {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)

  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState('')

  const [selectedSlot, setSelectedSlot] = useState(null) // e.g. "10:00 AM" or a custom "2:05:09 PM"
  const [customTime, setCustomTime] = useState('') // raw <input type="time"> value, "HH:MM:SS"
  const [useCustom, setUseCustom] = useState(false)

  const [interviewType, setInterviewType] = useState('technical')
  const [booking, setBooking] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [bookingsError, setBookingsError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

  const fetchBookings = () => {
    setLoadingBookings(true)
    api('/mock-interviews')
      .then((res) => setBookings(res || []))
      .catch((e) => setBookingsError(e.message || 'Could not load your scheduled interviews.'))
      .finally(() => setLoadingBookings(false))
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const cancelBooking = async (id) => {
    setCancellingId(id)
    try {
      await api(`/mock-interviews/${id}`, { method: 'DELETE' })
      setBookings((prev) => prev.filter((b) => b.id !== id))
    } catch (e) {
      setBookingsError(e.message || 'Could not remove that interview.')
    } finally {
      setCancellingId(null)
    }
  }

  // Re-fetch available slots every time the selected date changes.
  useEffect(() => {
    let ignore = false
    setLoadingSlots(true)
    setSlotsError('')
    setSelectedSlot(null)
    setUseCustom(false)
    setConfirmed(false)

    api(`/interview-slots?date=${toISODate(selectedDate)}`)
      .then((res) => {
        if (ignore) return
        setSlots(res.slots || [])
      })
      .catch((e) => {
        if (ignore) return
        setSlots([])
        // 404 just means the endpoint/slot config isn't set up yet — that's not
        // a user-facing error, so fall back to custom-time-only silently.
        const isMissingRoute = e.status === 404 || /not found/i.test(e.message || '')
        if (!isMissingRoute) setSlotsError(e.message || 'Could not load slots for this date.')
      })
      .finally(() => {
        if (!ignore) setLoadingSlots(false)
      })

    return () => {
      ignore = true
    }
  }, [selectedDate])

  const changeMonth = (delta) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  const pickDate = (date) => {
    if (!date) return
    setSelectedDate(date)
  }

  const pickPresetSlot = (s) => {
    setUseCustom(false)
    setCustomTime('')
    setSelectedSlot(s)
    setConfirmed(false)
  }

  const onCustomTimeChange = (value) => {
    setCustomTime(value)
    setUseCustom(true)
    setSelectedSlot(value ? formatClock(value) : null)
    setConfirmed(false)
  }

  const book = async () => {
    if (!selectedSlot || booking) return
    setBooking(true)
    try {
      await api('/mock-interviews/book', {
        method: 'POST',
        body: {
          date: toISODate(selectedDate),
          slot: selectedSlot,
          custom_time: useCustom ? customTime : null,
          type: interviewType,
        },
      })
      setConfirmed(true)
      fetchBookings()
    } catch (e) {
      const isMissingRoute = e.status === 404 || /not found/i.test(e.message || '')
      setSlotsError(isMissingRoute ? 'Booking isn\'t set up on the server yet.' : e.message || 'Could not book that slot.')
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="space-y-6">
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mock Interview Scheduler</h2>
          <p className="mt-0.5 text-sm text-slate-500">Book your slots, take mock interviews, get feedback.</p>
        </div>
        <CalendarDays size={18} className="mt-1 text-slate-300" />
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
        {/* calendar */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{MONTH_LABEL(cursor)}</span>
            <div className="flex gap-1">
              <button
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-1 text-[11px] font-medium text-slate-400">
                {w}
              </div>
            ))}
            {grid.map((date, i) => {
              const isSelected = sameDay(date, selectedDate)
              const isToday = sameDay(date, today)
              return (
                <button
                  key={i}
                  disabled={!date}
                  onClick={() => pickDate(date)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    !date
                      ? 'invisible'
                      : isSelected
                      ? 'bg-indigo-600 text-white'
                      : isToday
                      ? 'text-indigo-600 ring-1 ring-inset ring-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {date?.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        {/* slots + custom time + type + confirm */}
        <div className="flex flex-col">
          <h3 className="mb-2 text-xs font-semibold text-slate-400">Available Slots</h3>

          {loadingSlots && (
            <div className="flex items-center gap-1.5 py-2 text-xs text-slate-400">
              <Loader2 size={12} className="animate-spin" /> Loading slots...
            </div>
          )}

          {!loadingSlots && slotsError && (
            <p className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] text-red-600">{slotsError}</p>
          )}

          {!loadingSlots && !slotsError && slots.length === 0 && (
            <p className="py-1 text-[11px] text-slate-400">No fixed slots that day — pick a custom time below.</p>
          )}

          {!loadingSlots && slots.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => pickPresetSlot(s)}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                    !useCustom && selectedSlot === s
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Clock size={12} />
                  {s}
                </button>
              ))}
            </div>
          )}

          <h3 className="mb-1.5 mt-4 text-xs font-semibold text-slate-400">Or pick any time</h3>
          <input
            type="time"
            step="1"
            value={customTime}
            onChange={(e) => onCustomTimeChange(e.target.value)}
            className={`rounded-lg border px-2 py-1.5 text-xs font-medium outline-none ${
              useCustom ? 'border-indigo-600 text-indigo-600' : 'border-slate-200 text-slate-600'
            }`}
          />

          <h3 className="mb-2 mt-5 text-xs font-semibold text-slate-400">Type of Interview</h3>
          <div className="space-y-1.5">
            {INTERVIEW_TYPES.map((t) => (
              <label
                key={t.key}
                className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"
              >
                <input
                  type="radio"
                  name="interview-type"
                  checked={interviewType === t.key}
                  onChange={() => setInterviewType(t.key)}
                  className="h-3.5 w-3.5 accent-indigo-600"
                />
                {t.label}
              </label>
            ))}
          </div>

          <button
            onClick={book}
            disabled={!selectedSlot || booking}
            className="mt-5 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Video size={14} />
            {booking ? 'Booking...' : confirmed ? 'Booked ✓' : 'Book Session'}
          </button>

          {confirmed && (
            <p className="mt-2 text-[11px] text-emerald-600">
              Confirmed for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {selectedSlot}.
            </p>
          )}
        </div>
      </div>
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-bold text-slate-900">Your Scheduled Interviews</h2>
      <p className="mb-4 text-sm text-slate-500">What you booked it for, and whether it's done.</p>

      {loadingBookings && (
        <div className="flex items-center gap-1.5 py-2 text-xs text-slate-400">
          <Loader2 size={12} className="animate-spin" /> Loading your bookings...
        </div>
      )}

      {!loadingBookings && bookingsError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{bookingsError}</p>
      )}

      {!loadingBookings && !bookingsError && bookings.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
          No interviews scheduled yet — book one above.
        </p>
      )}

      {!loadingBookings && bookings.length > 0 && (
        <ul className="space-y-2">
          {bookings.map((b) => {
            const st = STATUS_STYLES[b.status] || { label: b.status, className: 'bg-slate-100 text-slate-500' }
            return (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      b.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'
                    }`}
                  >
                    {b.status === 'completed' ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-700">
                      {TYPE_LABELS[b.interview_type] || b.interview_type}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      {formatBookingDate(b.scheduled_date)} &middot; {b.slot}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.className}`}>
                    {st.label}
                  </span>
                  <button
                    onClick={() => cancelBooking(b.id)}
                    disabled={cancellingId === b.id}
                    aria-label="Remove interview"
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:opacity-50"
                  >
                    {cancellingId === b.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
    </div>
  )
}