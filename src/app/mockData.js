// Mock data for the A3 build. Replaced by live Twilio-fed rows in Track B (B2.1).
const ago = (mins) => new Date(Date.now() - mins * 60 * 1000).toISOString();

export const MOCK_CONVERSATIONS = [
  { id: 'c1', name: 'Dana R.', phone: '(412) 555-0134', tag: 'new', unread: true, messages: [
    { id: 'm1', dir: 'in', kind: 'missed_call', body: 'Missed call', at: ago(14) },
    { id: 'm2', dir: 'out', kind: 'auto_reply', body: "Sorry we missed you, what do you need help with?", at: ago(13) },
    { id: 'm3', dir: 'in', kind: 'message', body: 'Water heater is leaking in the basement, can someone come today?', at: ago(11) },
  ]},
  { id: 'c2', name: '(724) 555-0190', phone: '(724) 555-0190', tag: 'quoted', unread: false, messages: [
    { id: 'm4', dir: 'in', kind: 'missed_call', body: 'Missed call', at: ago(300) },
    { id: 'm5', dir: 'out', kind: 'auto_reply', body: "Sorry we missed you, what do you need help with?", at: ago(299) },
    { id: 'm6', dir: 'in', kind: 'message', body: 'Need a quote to replace 3 windows.', at: ago(290) },
    { id: 'm7', dir: 'out', kind: 'message', body: 'Happy to. Can I swing by Thursday at 4 to measure?', at: ago(240) },
  ]},
  { id: 'c3', name: 'Marcus T.', phone: '(412) 555-0177', tag: 'booked', unread: false, messages: [
    { id: 'm8', dir: 'in', kind: 'missed_call', body: 'Missed call', at: ago(1500) },
    { id: 'm9', dir: 'out', kind: 'auto_reply', body: "Sorry we missed you, what do you need help with?", at: ago(1499) },
    { id: 'm10', dir: 'in', kind: 'message', body: 'AC not cooling. Anything open Friday?', at: ago(1480) },
    { id: 'm11', dir: 'out', kind: 'message', body: 'Friday 9am works. See you then.', at: ago(1460) },
  ]},
  { id: 'c4', name: '(412) 555-0102', phone: '(412) 555-0102', tag: 'lost', unread: false, messages: [
    { id: 'm12', dir: 'in', kind: 'missed_call', body: 'Missed call', at: ago(4000) },
    { id: 'm13', dir: 'out', kind: 'auto_reply', body: "Sorry we missed you, what do you need help with?", at: ago(3999) },
  ]},
];

export const DEFAULT_AUTO_REPLY = "Sorry we missed you, what do you need help with?";
export const DEFAULT_AFTER_HOURS = "Thanks for calling! We're closed right now but will text you first thing in the morning. If it's an emergency, reply URGENT.";
