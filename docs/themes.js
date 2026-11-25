/* Theme registry. A theme page is just <html data-theme="slug"> + ../themes/slug.css.
   Everything that differs in wording or behaviour lives here; looks live in CSS.
     intro: "dive" (lab-site loader) | "crawl" (opening text crawl) | null
     fx:    "snow" | "stars" | "paws" | null   (canvas effect from fx.js)
     tiles: 12 short labels for the dive intro's tile burst */
/* The event's name, in one place (title lines, English name, year). */
window.DECK_EVENT = { title: ["Dinar", "de Nadal"], en: "Christmas lunch", year: 2026 };

window.DECK_THEMES = {
  lab: {
    bar: "",
    kicker: "",
    lede: "What the team asked for, what it means, and where we could go.",
    thanks: "for your time.",
    intro: "dive", fx: null,
    tiles: ["03", "XII", "15", "€", "", "BCN", "20", "", "CIL", "26", "◯", "✳"],
  },

  burton: {
    bar: "Halloween is over",
    kicker: "Halloween is over",
    lede: "The pumpkins are packed away. Here’s what the team asked for, and where we could go.",
    thanks: "for your time. Halloween is over — see you at lunch.",
    intro: "dive", fx: "snow",
    tiles: ["❄", "BOO", "☾", "31·X", "", "XII", "✶", "", "❄", "25", "☾", "✶"],
  },

  pinkpanther: {
    bar: "Case file Nº 12",
    kicker: "The case of the Christmas lunch",
    lede: "The witnesses have spoken. Here’s what they told us, and where the trail leads.",
    thanks: "for your time. Case closed.",
    intro: "dive", fx: "paws",
    tiles: ["?", "Nº12", "CASE", "XII", "", "03", "✳", "", "15", "€", "?", "BCN"],
  },

  starwars: {
    bar: "Episode XII",
    kicker: "Episode XII",
    lede: "The team has spoken. Here’s what they asked for, and where we could go.",
    thanks: "for your time. May the menu be with you.",
    intro: "crawl", fx: "stars",
    // Opening crawl, written from the survey summary.
    crawl: (d) => {
      const c = d.conclusions;
      return {
        prelude: "Not so long ago, in an office not so far away…",
        episode: "Episode XII",
        title: "The Christmas Lunch",
        paragraphs: [
          `It is a time of planning. ${d.responses} members of the Creative Intelligence Lab have answered the survey, revealing their wishes for the end of the year.`,
          `${c.date_count} of them can gather on ${c.date}. ${c.food[0]} and ${c.food[1]} cooking lead the wishes, and a menu close to €${c.price_everyone} fits every budget.`,
          `Now the planners race across central Barcelona in search of a table for ${c.group_size} that accepts Ticket Restaurant…`,
        ],
      };
    },
  },
};
