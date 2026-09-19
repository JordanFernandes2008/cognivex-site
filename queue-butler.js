/* ============================================================================
   NOT ONLY EMAIL.

   The queue so far is inbox work, which is the narrow reading of what this is.
   The wider one is the point: anything digital that needs a decision and would
   otherwise have you opening six apps to make it. Calendar collisions, bills,
   reorders, bookings, documents, subscriptions, deliveries.

   Every one still ends the same way — drafted, reasoned, waiting on a yes. The
   rule does not bend because the task is a table booking instead of a reply,
   and nothing here is ever sent, paid or placed on its own.

   WHAT THIS DOES NOT CLAIM. No integration is named, no account is connected,
   no price for Cognivex appears. The amounts are this fictional workshop's own
   bills. The page's footer already says the interface is illustrative and not
   connected to a live account, and that stays true of every item below.
   ========================================================================== */
window.COGNIVEX_QUEUE_EXTRA = [

  /* ---- the day itself ---------------------------------------------------- */
  { av: "CAL", kind: "Calendar", meta: "Saturday · three things collide", age: "This week",
    draft: "Saturday has the workshop open morning, Anita's delivery window and your sister's thing at seven. The delivery is the only movable one — shall I ask them for Monday instead?",
    why: "All three are in your calendar. The delivery is the only one whose supplier offers alternative slots.",
    levi: "Three things on Saturday. Only one of them moves." },

  { av: "CAL", kind: "Calendar", meta: "Dentist · they offered a new slot", age: "2d",
    draft: "They can move you to the 14th at 4pm, which clears your Tuesday morning entirely. I have not confirmed it.",
    why: "The surgery emailed the alternative. Tuesday morning is the workshop's busiest, so this is the better of the two.",
    levi: "Their new slot is better for you. Still your call." },

  /* ---- money out --------------------------------------------------------- */
  { av: "PAY", kind: "Payment", meta: "Electricity · due in four days", age: "Due 23 Sep",
    draft: "The bill is ₹4,180 this cycle, about a fifth higher than last month — the compressor has been running longer. Ready to pay on the due date.",
    why: "Amount and date are from the bill itself. The comparison is against your own last twelve months, not an estimate.",
    levi: "A fifth higher. That is the compressor, not an error." },

  { av: "PAY", kind: "Payment", meta: "Timber supplier · invoice 4471", age: "Due Friday",
    draft: "Their invoice matches the delivery note and the quoted rate, line for line. Ready to pay Friday, the last day before it is late.",
    why: "Checked against what actually arrived. Nothing leaves the account until you approve it.",
    levi: "It matches the delivery note. I checked every line." },

  { av: "PAY", kind: "Payment", meta: "Unrecognised charge · held", age: "Today",
    draft: "A ₹2,400 charge from a name you have never paid before. I have not blocked it — that is yours — but it is flagged and waiting.",
    why: "No match anywhere in eighteen months of your statements. Held rather than actioned, because either answer could be the wrong one.",
    levi: "I do not recognise this one. You probably won't either." },

  /* ---- things that run out ----------------------------------------------- */
  { av: "ORD", kind: "Order", meta: "Bandsaw blades · last one left", age: "Reorder",
    draft: "Same blades as always, box of five, from the supplier you used in June. Four-day delivery, which covers next week's resawing.",
    why: "Your usage since the last order says this is the final blade. Same supplier and spec as the order that worked.",
    levi: "Last blade, four days out, two jobs waiting on it." },

  { av: "ORD", kind: "Order", meta: "Finishing oil · running low", age: "Reorder",
    draft: "Two litres of the hardwood oil, same brand. It is the one thing you cannot substitute halfway through a piece.",
    why: "Roughly a litre left against three pieces in finishing this month.",
    levi: "You cannot swap brands mid-piece. Hence now." },

  /* ---- the party --------------------------------------------------------- */
  { av: "BKG", kind: "Booking", meta: "Party, Saturday 6pm · the food", age: "Tomorrow",
    draft: "Twelve people, two vegetarian, one no dairy — that is from last time. The place on Chapel Road can do a platter set for 6pm pickup. I have it held, not ordered.",
    why: "Numbers and dietary notes come from the last two gatherings in your calendar. Held so the slot does not go while you think.",
    levi: "Twelve, two veg, one no dairy. Same as last time." },

  { av: "BKG", kind: "Booking", meta: "Party · the paying part", age: "Tomorrow",
    draft: "The platter set is ₹8,600 including the pickup slot. Approve this amount and I will place it and pay. Decline and the hold lapses tonight.",
    why: "One amount, one decision. Approving this does not become a standing permission to spend — the next one asks again.",
    levi: "One amount, one yes. It does not become a rule." },

  { av: "BKG", kind: "Booking", meta: "Table for four · Thursday", age: "3d",
    draft: "Eight o'clock is gone. They have 7:15 or 9:00 and I have booked neither. Which one?",
    why: "Asked rather than chosen, because you have complained about both an early table and a late one before.",
    levi: "Neither time is good. You pick which is less bad." },

  /* ---- paperwork --------------------------------------------------------- */
  { av: "DOC", kind: "Document", meta: "Insurance renewal · three quotes", age: "11d",
    draft: "Three quotes laid against your current cover. The cheapest drops the tool cover you actually claimed on in 2024, so I have marked it rather than ranked it first.",
    why: "Quotes are from brokers you already use. The warning comes from your own claim history.",
    levi: "The cheapest drops the cover you once claimed on." },

  { av: "DOC", kind: "Document", meta: "GST filing · assembled", age: "Due 20 Oct",
    draft: "Everything your accountant asks for each quarter, in the order she asks for it. Ready to send the moment you say.",
    why: "Same document set as the last four quarters. Assembled, not filed — filing is not mine to do.",
    levi: "Assembled, not filed. Filing is not mine to do." },

  /* ---- quiet money leaks -------------------------------------------------- */
  { av: "SUB", kind: "Subscription", meta: "Design tool · unused five months", age: "Renews 2 Oct",
    draft: "Renews on the 2nd at ₹1,770. You have not opened it since April. Cancel it, or keep it?",
    why: "Renewal date from the receipt, usage from your own sign-ins. Not cancelled, because you may want it back in winter.",
    levi: "Five months unopened. It renews on the second." },

  { av: "SUB", kind: "Subscription", meta: "Cloud storage · nearly full", age: "94% used",
    draft: "You are at 94%. The next tier is ₹400 a month, or I can move 2023's finished-job photographs to cold storage for nothing.",
    why: "Two options, because the free one is genuinely viable — those files have not been opened in over a year.",
    levi: "There is a free way to fix this. Try that first." },

  /* ---- things arriving ---------------------------------------------------- */
  { av: "DEL", kind: "Delivery", meta: "Walnut order · Thursday window", age: "Thursday",
    draft: "The mill has it Thursday between ten and two. That collides with Anita's collection by about ninety minutes — I can ask them to make it afternoon.",
    why: "Both windows are in your calendar and they overlap. The mill is the one that offers a choice.",
    levi: "This lands on Anita's collection. Ninety minutes." },

  { av: "DEL", kind: "Delivery", meta: "Courier · failed attempt", age: "Today",
    draft: "They tried at 11:40 and nobody was in. Redelivery is free if booked today; tomorrow it goes to the depot and you collect it yourself.",
    why: "From the courier's own notice. Raised today because the free option expires at midnight.",
    levi: "Free if you rebook today. Not if you leave it." },

  /* ---- the slow-burning ones ---------------------------------------------- */
  { av: "!", kind: "Reminder", meta: "Passport · five months left", age: "Feb",
    draft: "Five months. Most countries want six, so if there is any travel next year this is the last comfortable moment to start it.",
    why: "Expiry is from the document. The six-month rule is why five months is the flag and not three.",
    levi: "Five months left. Most countries want six." },

  { av: "!", kind: "Reminder", meta: "Fire extinguisher · service overdue", age: "Overdue",
    draft: "The service sticker ran out in July. It is a twenty-minute visit and they come to the workshop.",
    why: "From the sticker in the photograph you took in January. Two months past.",
    levi: "Two months past its service. Twenty-minute job." }
];
