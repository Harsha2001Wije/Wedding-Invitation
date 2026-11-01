import type { InvitationConfig } from './types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE ONE FILE TO EDIT.
 *  Every name, date, time, venue, message and option on the invitation comes
 *  from here. Rendering code never hard-codes invitation content.
 *
 *  SAMPLE DATA: the names, venues, phone numbers, dates and times below are
 *  placeholders. Every time is marked `timeStatus: 'sample'`, which shows a
 *  visible "sample time" label. Replace each with the confirmed time from the
 *  families (e.g. the auspicious nekath) and set `timeStatus: 'confirmed'`.
 *  Use `time: null, timeStatus: 'tba'` when a time is not known yet.
 *
 *  Sinhala wording was drafted for this template. Please have it read by a
 *  native speaker in the family before sending.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const invitation: InvitationConfig = {
  // Shows a "Preview" ribbon and labels RSVP responses as demo-only.
  demo: false,

  couple: {
    bride: { en: 'Nethmi', si: 'නෙත්මි' },
    groom: { en: 'Kavindu', si: 'කවිඳු' },
    monogram: 'N & K',
  },

  // Set to null to hide the family section.
  families: {
    bride: {
      parents: {
        en: 'Daughter of Mr. & Mrs. Sunil Perera',
        si: 'සුනිල් පෙරේරා මහතා සහ මහත්මියගේ ආදරණීය දියණිය',
      },
      from: { en: 'of Kandy', si: 'මහනුවර' },
    },
    groom: {
      parents: {
        en: 'Son of Mr. & Mrs. Ranjith Jayasinghe',
        si: 'රංජිත් ජයසිංහ මහතා සහ මහත්මියගේ ආදරණීය පුත්‍රයා',
      },
      from: { en: 'of Nugegoda', si: 'නුගේගොඩ' },
    },
  },

  weddingDate: '2027-02-13',
  mainVenueId: 'main',

  copy: {
    opening: {
      en: 'Together with our families, we invite you to celebrate our wedding.',
      si: 'අපගේ පවුල් සමඟ එක්ව, අපගේ විවාහ මංගල්‍යය සමරන්නට ඔබට ආදරයෙන් ආරාධනා කරමු.',
    },
    welcome: {
      en: 'Welcome. We are so glad you could come. The doors are open for you.',
      si: 'සාදරයෙන් පිළිගනිමු. ඔබ පැමිණීම අපට මහත් සතුටකි. දොරටු ඔබ වෙනුවෙන් විවෘතයි.',
    },
    invitation: {
      en: 'With the blessings of our parents, we request the pleasure of your company as we begin our married life together.',
      si: 'අපගේ දෙමාපියන්ගේ ආශීර්වාදය ඇතිව, අප විවාහ දිවියට පිවිසෙන මේ සුබ මොහොතට ඔබගේ සහභාගීත්වය ගෞරවයෙන් අපේක්ෂා කරමු.',
    },
    familyIntro: { en: 'With our families', si: 'අපගේ පවුල් සමඟ' },
    closing: {
      en: 'We would love to celebrate with you.',
      si: 'ඔබ සමඟ මේ සතුට සැමරීමට අපි ආශාවෙන් බලා සිටිමු.',
    },
    // Set to null to hide.
    dressCode: {
      en: 'Traditional or formal attire. Soft, light colours are welcome.',
      si: 'සාම්ප්‍රදායික හෝ විධිමත් ඇඳුම්. ලා පැහැති වර්ණ වඩාත් සුදුසුයි.',
    },
    mealDietaryPrompt: {
      en: 'Any dietary needs? Tell us when you reply.',
      si: 'විශේෂ ආහාර අවශ්‍යතා ඇත්නම්, පිළිතුරු දෙන විට අපට දන්වන්න.',
    },
  },

  // Agenda order is by date and time. Disable anything the couple isn't having.
  events: [
    {
      id: 'poruwa',
      kind: 'poruwa',
      enabled: true,
      title: { en: 'Poruwa Ceremony', si: 'පෝරු චාරිත්‍රය' },
      description: {
        en: 'Join us as we step onto the Poruwa, surrounded by family, and begin our married life with your blessings.',
        si: 'පවුලේ සැමගේ ආශීර්වාද මැද, අප පෝරුවට නැගී විවාහ දිවිය අරඹන මේ සුබ මොහොතට අප හා එක්වන්න.',
      },
      date: '2027-02-13',
      time: '09:41',
      endTime: '10:30',
      timeStatus: 'confirmed',
      venueId: 'main',
      rsvpSelectable: true,
    },
    {
      id: 'oil-lamp',
      kind: 'oilLamp',
      enabled: true,
      title: { en: 'Lighting of the Oil Lamp', si: 'තෙල් පහන දැල්වීම' },
      description: {
        en: 'We light the oil lamp together, with good wishes for the life ahead.',
        si: 'ඉදිරි ජීවිතයට ආලෝකය හා සුබ පැතුම් පතා, අප එක්ව තෙල් පහන දල්වන මොහොත.',
      },
      date: '2027-02-13',
      time: '10:40',
      endTime: '11:00',
      timeStatus: 'confirmed',
      venueId: 'main',
      rsvpSelectable: false,
    },
    {
      id: 'reception',
      kind: 'reception',
      enabled: true,
      title: { en: 'The Wedding Reception', si: 'මංගල සාදය' },
      description: {
        en: 'Stay with us for music, good company and a celebration with the people we love most.',
        si: 'අප වඩාත් ආදරය කරන අය සමඟ සංගීතයෙන් හා සතුටින් පිරි සැමරුමකට අප හා රැඳී සිටින්න.',
      },
      date: '2027-02-13',
      time: '11:15',
      endTime: '15:30',
      timeStatus: 'confirmed',
      venueId: 'main',
      rsvpSelectable: true,
    },
    // Optional reception moments. These are not required Sinhala traditions:
    // enable only the ones the couple has planned.
    {
      id: 'entrance',
      kind: 'moment',
      parentId: 'reception',
      enabled: true,
      title: { en: "The couple's entrance", si: 'මනාල යුවළගේ පිවිසුම' },
      description: { en: '', si: '' },
      date: '2027-02-13',
      time: '11:30',
      timeStatus: 'confirmed',
      venueId: 'main',
      rsvpSelectable: false,
    },
    {
      id: 'cake',
      kind: 'moment',
      parentId: 'reception',
      enabled: false,
      title: { en: 'Cake cutting', si: 'මංගල කේක් කැපීම' },
      description: { en: '', si: '' },
      date: '2027-02-13',
      time: null,
      timeStatus: 'tba',
      venueId: 'main',
      rsvpSelectable: false,
    },
    {
      id: 'first-dance',
      kind: 'moment',
      parentId: 'reception',
      enabled: false,
      title: { en: 'First dance', si: 'පළමු නර්තනය' },
      description: { en: '', si: '' },
      date: '2027-02-13',
      time: null,
      timeStatus: 'tba',
      venueId: 'main',
      rsvpSelectable: false,
    },
    {
      id: 'meal',
      kind: 'meal',
      mealType: 'lunch',
      enabled: true,
      title: { en: 'Wedding Lunch', si: 'මංගල දිවා භෝජනය' },
      description: {
        en: 'Please join us at the table. Lunch is prepared with love and there is plenty to share.',
        si: 'කරුණාකර අප සමඟ භෝජන සංග්‍රහයට එක්වන්න. ආදරයෙන් පිළියෙළ කළ දිවා භෝජනය ඔබ වෙනුවෙන්.',
      },
      date: '2027-02-13',
      time: '12:30',
      endTime: '14:30',
      timeStatus: 'confirmed',
      venueId: 'main',
      rsvpSelectable: false,
    },
    {
      id: 'homecoming',
      kind: 'homecoming',
      enabled: true,
      // 'invited' = shown only to guests whose link includes ?hc=1
      eligibility: 'invited',
      title: { en: 'Homecoming', si: 'ගෙදර ඒම' },
      description: {
        en: 'An evening with our families as we return home as a married couple. Hosted by the groom’s family.',
        si: 'විවාහක යුවළක් ලෙස අප නිවසට පැමිණෙන සවස, පවුල් සමඟ ගත කරන සැමරුමකි. මනාලයාගේ පවුල විසින් සංවිධානය කෙරේ.',
      },
      date: '2027-02-20',
      time: '19:00',
      endTime: '22:30',
      timeStatus: 'confirmed',
      venueId: 'homecoming',
      rsvpSelectable: true,
    },
  ],

  venues: [
    {
      id: 'main',
      name: { en: 'The Lotus Pavilion', si: 'ලෝටස් මණ්ඩපය' },
      address: { en: 'Peradeniya Road, Kandy', si: 'පේරාදෙණිය පාර, මහනුවර' },
      mapUrl: 'https://maps.google.com/?q=Peradeniya+Road+Kandy+Sri+Lanka',
    },
    {
      id: 'homecoming',
      name: { en: 'Garden Terrace', si: 'ගාර්ඩන් ටෙරස්' },
      address: { en: 'High Level Road, Nugegoda', si: 'හයිලෙවල් පාර, නුගේගොඩ' },
      mapUrl: 'https://maps.google.com/?q=High+Level+Road+Nugegoda+Sri+Lanka',
    },
  ],

  // The cinematic journey. Reorder, disable, or change `length` (viewport
  // heights of scroll). Event scenes are skipped automatically when their
  // event is disabled, and the camera path re-links without a gap.
  scenes: [
    { kind: 'envelope', enabled: true, length: 1.7 },
    { kind: 'arrival', enabled: true, length: 2.6 },
    { kind: 'hall', enabled: true, length: 3.2 },
    { kind: 'poruwa', enabled: true, eventId: 'poruwa', length: 2.6 },
    { kind: 'oilLamp', enabled: true, eventId: 'oil-lamp', length: 2.2 },
    { kind: 'reception', enabled: true, eventId: 'reception', length: 2.6 },
    { kind: 'meal', enabled: true, eventId: 'meal', length: 2.3 },
    { kind: 'closing', enabled: true, length: 2.4 },
  ],

  rsvp: {
    deadline: '2027-01-15',
    defaultMaxParty: 2,
    dietaryOptions: [
      { id: 'vegetarian', label: { en: 'Vegetarian', si: 'නිර්මාංශ' } },
      { id: 'vegan', label: { en: 'Vegan', si: 'සම්පූර්ණ ශාකාහාර' } },
      { id: 'no-beef', label: { en: 'No beef', si: 'හරක් මස් නොකන' } },
      { id: 'no-pork', label: { en: 'No pork', si: 'ඌරු මස් නොකන' } },
      { id: 'halal', label: { en: 'Halal', si: 'හලාල්' } },
      { id: 'nut-allergy', label: { en: 'Nut allergy', si: 'ඇට වර්ග අසාත්මිකතා' } },
      { id: 'seafood-allergy', label: { en: 'Seafood allergy', si: 'මුහුදු ආහාර අසාත්මිකතා' } },
    ],
    messageMaxLength: 500,
    adapter: 'mock',
    endpoint: undefined,
  },

  contacts: [
    {
      name: { en: 'Sunil Perera', si: 'සුනිල් පෙරේරා' },
      role: { en: "Bride's father", si: 'මනාලියගේ පියා' },
      phone: '+94 77 000 0001',
    },
    {
      name: { en: 'Ranjith Jayasinghe', si: 'රංජිත් ජයසිංහ' },
      role: { en: "Groom's father", si: 'මනාලයාගේ පියා' },
      phone: '+94 77 000 0002',
    },
  ],

  languages: { default: 'en', available: ['en', 'si'] },

  theme: {
    ivory: '#FBF6EC',
    pearl: '#F1E9DA',
    gold: '#C8A45D',
    goldDeep: '#8E6B2E',
    green: '#5F7A5A',
    blush: '#E6B9AE',
    ink: '#2E2A22',
  },

  audio: { enabled: true, src: null, volume: 0.35 },

  assets: { mode: 'procedural', posters: {} },
};
