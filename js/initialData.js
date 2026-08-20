/**
 * EL FALASTENY - INDEPENDENT INITIAL DATASET
 * Dedicated for Ahmed El Falasteny
 */
const INITIAL_ITEMS = [
  // --- GAMES ---
  {
    id: "game_fc25",
    type: "game",
    name: "EA SPORTS FC 25",
    arabicName: "إي إيه سبورتس إف سي 25",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202406/2421/a03c3bbd4a2fa45e3ea1dfc2826dbf38d38a3d64c052cb78.png",
    stock: {
      pry_ps4: 5,
      pry_ps5: 8,
      sec: 10,
      off_ps4: 4,
      off_ps5: 6
    }
  },
  {
    id: "game_gta5",
    type: "game",
    name: "Grand Theft Auto V (GTA V)",
    arabicName: "جراند ثفت أوتو 5",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202202/2816/mYn2ETBTXD28GPCTotAcNxHx.png",
    stock: {
      pry_ps4: 6,
      pry_ps5: 9,
      sec: 12,
      off_ps4: 5,
      off_ps5: 7
    }
  },
  {
    id: "game_gow_ragnarok",
    type: "game",
    name: "God of War Ragnarök",
    arabicName: "إله الحرب: راجناروك",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png",
    stock: {
      pry_ps4: 4,
      pry_ps5: 7,
      sec: 8,
      off_ps4: 3,
      off_ps5: 5
    }
  },
  {
    id: "game_spiderman2",
    type: "game",
    name: "Marvel's Spider-Man 2",
    arabicName: "مارفل سبايدرمان 2",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/1c7b75d8edd9371d6716a5b6d914d7938363715c0e44b94f.png",
    stock: {
      pry_ps4: 0,
      pry_ps5: 9,
      sec: 11,
      off_ps4: 0,
      off_ps5: 6
    }
  },
  {
    id: "game_cod_bo6",
    type: "game",
    name: "Call of Duty: Black Ops 6",
    arabicName: "كول أوف ديوتي: بلاك أوبس 6",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202405/2921/5fa369bc4389fb13b3ae7d507bfa76722d4f8fffe819bcba.png",
    stock: {
      pry_ps4: 6,
      pry_ps5: 10,
      sec: 14,
      off_ps4: 5,
      off_ps5: 8
    }
  },
  {
    id: "game_cyberpunk",
    type: "game",
    name: "Cyberpunk 2077",
    arabicName: "سايبربانك 2077",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1120/4e1cf65d95e0031ee41764c2ca59f81ad2b724458f448651.png",
    stock: {
      pry_ps4: 3,
      pry_ps5: 6,
      sec: 7,
      off_ps4: 2,
      off_ps5: 4
    }
  },
  {
    id: "game_rdr2",
    type: "game",
    name: "Red Dead Redemption 2",
    arabicName: "ريد ديد ريدمبشن 2",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202207/1917/7tP9j535d8a9F7tXb3pP4kK6.png",
    stock: {
      pry_ps4: 5,
      pry_ps5: 8,
      sec: 9,
      off_ps4: 4,
      off_ps5: 5
    }
  },
  {
    id: "game_ac_mirage",
    type: "game",
    name: "Assassin's Creed Mirage",
    arabicName: "أساسنز كريد ميراج",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202305/1716/186a8ff3bc2f50539b2da3233827ec31ea150c7650f146be.png",
    stock: {
      pry_ps4: 4,
      pry_ps5: 6,
      sec: 7,
      off_ps4: 3,
      off_ps5: 4
    }
  },
  {
    id: "game_mortal_kombat_1",
    type: "game",
    name: "Mortal Kombat 1",
    arabicName: "مورتال كومبات 1",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202305/1715/4597b69c4c79802ea1bc83226a27e7f7ca7566580fbb5dfa.png",
    stock: {
      pry_ps4: 2,
      pry_ps5: 5,
      sec: 6,
      off_ps4: 2,
      off_ps5: 3
    }
  },
  {
    id: "game_it_takes_two",
    type: "game",
    name: "It Takes Two",
    arabicName: "إت تيكس تو (تعاوني)",
    image: "https://image.api.playstation.com/vulcan/ap/rnd/202012/0815/hQ9yA2f9011JqG07zE5p5pA1.png",
    stock: {
      pry_ps4: 5,
      pry_ps5: 7,
      sec: 8,
      off_ps4: 4,
      off_ps5: 5
    }
  },

  // --- SUBSCRIPTIONS ---
  {
    id: "sub_ps_deluxe",
    type: "subscription",
    name: "PlayStation Plus Deluxe (12 Months)",
    arabicName: "اشتراك بلايستيشن بلس ديلوكس (سنة كاملة)",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80",
    stock: {
      pry_ps4: 7,
      pry_ps5: 12,
      sec: 16
    }
  },
  {
    id: "sub_ps_extra",
    type: "subscription",
    name: "PlayStation Plus Extra (12 Months)",
    arabicName: "اشتراك بلايستيشن بلس إكسترا (سنة كاملة)",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
    stock: {
      pry_ps4: 9,
      pry_ps5: 15,
      sec: 20
    }
  },
  {
    id: "sub_ps_essential",
    type: "subscription",
    name: "PlayStation Plus Essential (12 Months)",
    arabicName: "اشتراك بلايستيشن بلس إسنشال (سنة كاملة)",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
    stock: {
      pry_ps4: 10,
      pry_ps5: 14,
      sec: 22
    }
  },
  {
    id: "sub_gamepass",
    type: "subscription",
    name: "Xbox Game Pass Ultimate (3 Months)",
    arabicName: "اشتراك جيم باس ألتيميت (3 شهور)",
    image: "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=800&q=80",
    stock: {
      pry_ps4: 0,
      pry_ps5: 8,
      sec: 12
    }
  },
  {
    id: "sub_eaplay",
    type: "subscription",
    name: "EA Play (12 Months)",
    arabicName: "اشتراك إي إيه بلاي (سنة)",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    stock: {
      pry_ps4: 5,
      pry_ps5: 8,
      sec: 11
    }
  }
];
