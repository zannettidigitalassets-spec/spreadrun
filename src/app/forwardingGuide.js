// Conditional call forwarding setup content (A3.4). Pure content, no Twilio needed.
// "Conditional" = forward only when you don't answer / are busy / are unreachable, so
// your number and your normal calls are untouched.
//
// NOTE FOR TRACK B: these dial codes are the commonly documented ones, but they must be
// verified on real AT&T, Verizon and T-Mobile lines during the end-to-end test (B2.3)
// before launch. Update this file with whatever the real phones actually need.

export const FORWARD_TO_PLACEHOLDER = '[your SecondRing number]';

export const CARRIERS = [
  {
    id: 'att',
    name: 'AT&T',
    intro: 'Works from the phone dialer. Not changed by the iPhone/Android Call Forwarding setting, which forwards ALL calls.',
    steps: [
      'Open your phone app and type: **004*{NUMBER}#',
      'Press Call. Wait for the confirmation message.',
      'Test it: call your number from another phone and let it ring without answering.',
    ],
    turnOff: 'To turn it off, dial ##004# and press Call.',
  },
  {
    id: 'verizon',
    name: 'Verizon',
    intro: 'Verizon uses a short star code for "no answer / busy" forwarding.',
    steps: [
      'Open your phone app and type: *71{NUMBER}',
      'Press Call. You should hear a confirmation tone or message.',
      'Test it: call your number from another phone and let it ring without answering.',
    ],
    turnOff: 'To turn it off, dial *73 and press Call.',
  },
  {
    id: 'tmobile',
    name: 'T-Mobile',
    intro: 'Works from the phone dialer and forwards when you are busy, do not answer, or are unreachable.',
    steps: [
      'Open your phone app and type: **004*{NUMBER}#',
      'Press Call. Wait for the confirmation message.',
      'Test it: call your number from another phone and let it ring without answering.',
    ],
    turnOff: 'To turn it off, dial ##004# and press Call.',
  },
];

export const GUIDE_FOOTER =
  "Codes can differ by plan or phone. If a code doesn't work, call your carrier and ask them to set up \"conditional call forwarding for busy, no answer and unreachable\" to your SecondRing number.";
