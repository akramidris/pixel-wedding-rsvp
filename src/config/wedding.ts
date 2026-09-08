// Edit this file to personalise the entire invitation. All details below are samples.
export const weddingConfig = {
  title: 'A Garden of Us',
  groom: { name: 'Adam', fullName: 'Adam Hakimi', father: 'Encik Hakim', mother: 'Puan Aisyah' },
  bride: { name: 'Hana', fullName: 'Nur Hana', father: 'Encik Azman', mother: 'Puan Faridah' },
  wedding: {
    date: 'Saturday, 20 February 2027',
    shortDate: '20 February 2027',
    day: 'Saturday',
    isoDate: '2027-02-20T11:00:00+08:00',
    endDate: '2027-02-20T16:00:00+08:00',
    time: '11:00 AM – 4:00 PM',
    timezone: 'Asia/Kuala_Lumpur',
    timezoneLabel: 'Malaysia time · MYT (UTC+8)',
    reception: 'Wedding Reception',
  },
  venue: {
    name: 'The Glasshouse',
    address: 'Seputeh, Kuala Lumpur, Malaysia',
    // Replace these sample searches with your exact venue's share links.
    googleMaps: 'https://www.google.com/maps/search/?api=1&query=Glasshouse+Seputeh+Kuala+Lumpur',
    waze: 'https://waze.com/ul?q=Glasshouse%20Seputeh%20Kuala%20Lumpur&navigate=yes',
    facilities: [
      {
        title: 'Parking information',
        detail: 'Complimentary parking is available beside the hall.',
      },
      {
        title: 'Prayer room / Surau',
        detail: 'A prayer room and ablution facilities are available inside.',
      },
      { title: 'Main entrance', detail: 'Follow the flower-lined path to the main glass doors.' },
      {
        title: 'Reception counter',
        detail: 'Our family will welcome you just inside the entrance.',
      },
    ],
  },
  contact: { groom: '', bride: '' },
  invitation: {
    bismillah: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    greeting: 'Assalamualaikum Warahmatullahi Wabarakatuh',
    welcome:
      'With gratitude to Allah SWT, we warmly invite you to celebrate our special day with us.',
    introduction: 'With great pleasure, we invite you to celebrate the wedding of',
    families: 'Together with our beloved families.',
    closing: 'Your presence and prayers would make our celebration even more meaningful.',
  },
  story: [
    {
      year: '2022',
      title: 'We Met',
      description: 'An ordinary day. An unexpected hello. The beginning of something beautiful.',
    },
    {
      year: '2023',
      title: 'Our Journey Began',
      description: 'Conversations became memories, and two paths began to become one.',
    },
    {
      year: '2025',
      title: 'Engagement',
      description: 'With the blessings of our families, we promised each other a forever.',
    },
    {
      year: '2027',
      title: 'Our Wedding Day',
      description: 'A new chapter, surrounded by the people we love. That includes you.',
    },
  ],
  schedule: [
    {
      time: '11:00 AM',
      title: 'Guest Arrival',
      detail: 'A warm welcome, refreshments, and familiar faces.',
    },
    {
      time: '12:00 PM',
      title: 'Bride & Groom Arrival',
      detail: 'Join us as we make our entrance together.',
    },
    {
      time: '12:30 PM',
      title: 'Lunch / Reception',
      detail: 'Jemput makan! Share a meal with our families.',
    },
    {
      time: '1:30 PM',
      title: 'Photography',
      detail: 'A little moment to remember, with all our favourite people.',
    },
    {
      time: '4:00 PM',
      title: 'Event Ends',
      detail: 'Until we meet again. Thank you for your love and prayers.',
    },
  ],
  music: { src: 'audio/garden-melody.wav', defaultVolume: 0.3 },
  storageKey: 'garden-of-us-adam-hana-2027',
};
