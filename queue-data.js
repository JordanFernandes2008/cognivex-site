/* ============================================================================
   THE DEMO QUEUE — the rest of the night.

   index.html ships three cards in the markup so the page is a real page with
   JavaScript off. This file adds the other forty-seven, which is the
   difference between a screenshot of a product and something a client can sit
   and click through until they believe it.

   Every item is fictional demo data for one small studio in Mumbai, in the
   same voice as the three in the markup: a specific person, a specific thing,
   a draft that sounds like the owner wrote it, and a reason that explains
   itself without selling anything.

   FOUR KINDS, matching the ledger section exactly - inbox triage, invoices and
   follow-up, social posts, memory and priorities. Nothing here claims an
   integration, a price, or a capability the rest of the page does not.

   `levi` is what Levi says when that card reaches the top. It is the whole
   point of the thing having a voice: not narration of what you can already
   see, but the one sentence a good assistant would add.
   ========================================================================== */
window.COGNIVEX_QUEUE = [
  /* ---- inbox triage ------------------------------------------------------ */
  { av: "RK", kind: "Email reply", meta: "Rohan Kamat · delivery date", age: "2h",
    draft: "Hi Rohan — the walnut bench is finished and going for its last coat tomorrow. It will be ready to collect from Thursday, or we can deliver to Powai on Friday morning. Which suits you?",
    why: "He asked on Monday and again this morning. Both dates come from the workshop schedule, so neither one is a guess.",
    levi: "He asked twice. I would answer this one first." },
  { av: "AD", kind: "Email reply", meta: "Anita Desai · seat height", age: "4h",
    draft: "Hi Anita — standard seat height is 45cm. We can build it at 42 or 48 without changing the price, but it does add about a week. Happy to do a drawing at your height if that helps.",
    why: "She has asked about dimensions twice before ordering. The week is the workshop's own lead time, not an estimate.",
    levi: "She is measuring up. A drawing usually closes this one." },
  { av: "MQ", kind: "Email reply", meta: "Marcus Quill · care instructions", age: "1d",
    draft: "Hi Marcus — oil it twice a year with any hardwood oil, and wipe spills rather than leaving them. That is genuinely all of it. No wax, no polish.",
    why: "Third person to ask this month. Same answer each time, so it is worth having ready rather than retyped.",
    levi: "Third time this month. Worth a page on the site." },
  { av: "SB", kind: "Email reply", meta: "Sana Bhatt · lead time", age: "6h",
    draft: "Hi Sana — we are eleven weeks out for new commissions at the moment. If that is too long I will tell you rather than take the deposit and hope.",
    why: "Eleven weeks is what the current order book says. The second sentence is how you have answered this before.",
    levi: "Eleven weeks is the real number. I did not round it down." },
  { av: "TV", kind: "Email reply", meta: "Tara Vaz · shipping to Pune", age: "3h",
    draft: "Hi Tara — we do deliver to Pune. It is a flat rate for anything under two metres and we crate it ourselves. I can quote exactly once I know which piece.",
    why: "Pune is inside the delivery radius on file. The quote is left open because the piece is not chosen yet.",
    levi: "Inside the radius. She has not picked a piece yet." },
  { av: "JM", kind: "Email reply", meta: "Jay Mehta · press enquiry", age: "2d",
    draft: "Hi Jay — happy to talk. The workshop is in Andheri and mornings are quieter if you want photographs. Let me know which week and I will keep a morning free.",
    why: "Marked as press rather than a sale, so it is drafted warmer and does not mention lead times or deposits.",
    levi: "Press, not a sale. I wrote it warmer." },
  { av: "NP", kind: "Email reply", meta: "Nikhil Patel · complaint, wrong item", age: "5h",
    draft: "Nikhil — that is our mistake and I am sorry. The correct chair is being packed now and will reach you Thursday. Keep the one you have until the courier collects it; you should not be out of a chair because of us.",
    why: "The order line and the dispatch note disagree, so the error is ours. Drafted as an apology with a fix, not a request for evidence.",
    levi: "Our error, not his. I did not ask him to prove it." },
  { av: "LF", kind: "Email reply", meta: "Leena Fernandes · gift wrapping", age: "1d",
    draft: "Hi Leena — we can wrap it and write a card, no charge. Tell me what you would like the card to say and the name it should go to.",
    why: "Wrapping is offered on the site and has never been charged for. The question back is the only thing missing to complete it.",
    levi: "Nothing to decide here. It only needs the card wording." },
  { av: "OK", kind: "Email reply", meta: "Omar Khan · trade discount", age: "8h",
    draft: "Hi Omar — we do have trade terms for repeat orders. Send me the studio details and what you are planning and I will put the numbers in writing.",
    why: "Trade terms exist but vary, so this asks for the detail rather than quoting a figure that might be wrong.",
    levi: "I did not quote a number. You set those case by case." },
  { av: "IS", kind: "Email reply", meta: "Ishaan Shah · commission brief", age: "1d",
    draft: "Hi Ishaan — this is a lovely brief and it is buildable. Before I quote: is the alcove square, and is there a skirting board to work around? Those two answers change the price more than anything else.",
    why: "Both questions come from past alcove commissions where an assumption cost a rebuild.",
    levi: "Those two questions have caught you out before." },
  { av: "PG", kind: "Email reply", meta: "Priya Gupta · sample swatch", age: "7h",
    draft: "Hi Priya — I will put three oak swatches in the post today. They are offcuts from the same boards we are working with this month, so they are honest about colour.",
    why: "Swatches are sent free. Saying they are current offcuts is true and answers the colour question before it is asked.",
    levi: "Current offcuts, so the colour is honest." },
  { av: "DR", kind: "Email reply", meta: "Dev Raut · cancel order", age: "3h",
    draft: "Dev — that is no problem at all. Nothing has been cut yet, so the deposit comes back in full. It should reach you in three to five working days.",
    why: "The job has not started, so the deposit is refundable under your own terms. No reason is asked for.",
    levi: "Nothing cut yet, so the deposit is his. I did not ask why." },
  { av: "AK", kind: "Email reply", meta: "Aarav Kulkarni · chasing quote", age: "4d",
    draft: "Aarav — apologies, this sat too long on my side. The quote is attached. If the number does not work, tell me and I will show you where it comes from.",
    why: "Four days without a reply, which is outside your usual. The apology is drafted because the delay is real.",
    levi: "Four days. The apology is warranted, so I left it in." },
  { av: "MS", kind: "Email reply", meta: "Meera Singh · repair, old piece", age: "2d",
    draft: "Hi Meera — we will happily repair it even though it is not ours. Bring it in and I will look at it before quoting; joints are usually cheaper to fix than they look.",
    why: "You have taken outside repairs before. The last sentence is what you actually say to people worried about cost.",
    levi: "Not one of yours, but you have taken these before." },

  /* ---- invoices and follow-up -------------------------------------------- */
  { av: "HT", kind: "Invoice", meta: "Harbour Table Co · balance due", age: "Due in 14d",
    draft: "Invoice 0148 for the balance on the harbour table, due in fourteen days. Deposit received in July is already deducted.",
    why: "The piece is marked delivered and the deposit is on file, so the balance is what is left. Nothing is charged here.",
    levi: "Deposit already deducted. This is only the balance." },
  { av: "BC", kind: "Invoice", meta: "Bandra Cafe · four stools", age: "Due in 30d",
    draft: "Invoice 0149 for four bar stools at the agreed rate, due in thirty days. Delivery included as quoted.",
    why: "Quantity and rate come from the accepted quote. Delivery was quoted as included, so it is not added again.",
    levi: "Matches the quote they accepted. No surprises in it." },
  { av: "VE", kind: "Invoice", meta: "Verma Interiors · second reminder", age: "34d overdue",
    draft: "Hello — invoice 0131 is now thirty-four days past due. I have attached it again in case it was missed. If there is a problem with it, I would rather hear that than keep sending reminders.",
    why: "First reminder went twenty days ago with no reply. Firmer than the first, and it still leaves them a way to say something is wrong.",
    levi: "Second reminder. Firmer, but still leaves them a door." },
  { av: "SK", kind: "Invoice", meta: "Sunil Kapoor · deposit request", age: "Awaiting",
    draft: "Invoice 0150 for the fifty percent deposit on the dining set. Work starts once it clears, and the balance is due on delivery.",
    why: "Fifty percent up front is your standard on commissions over a certain size, and this one is over it.",
    levi: "Your standard split. The order is over the threshold." },
  { av: "GA", kind: "Invoice", meta: "Gita Anand · overdue, first notice", age: "9d overdue",
    draft: "Hi Gita — invoice 0144 was due last week. Attaching it again in case it went to the wrong inbox. No rush if it is already in hand.",
    why: "Nine days and a first notice, so this is drafted light. She has always paid on time before.",
    levi: "She has never been late before. I kept it light." },
  { av: "WR", kind: "Invoice", meta: "Worli Residences · staged billing", age: "Due in 21d",
    draft: "Invoice 0151 for stage two of the Worli fit-out, due in twenty-one days. Stage one was settled in August.",
    why: "The contract bills in three stages and stage two is marked complete in the schedule.",
    levi: "Stage two of three. Stage one cleared in August." },
  { av: "RT", kind: "Invoice", meta: "Rustom Tailors · credit note", age: "Today",
    draft: "Credit note 0012 against invoice 0139, for the shelf that came back marked. Applied to your account rather than refunded, unless you would rather have it back.",
    why: "The return is logged and the piece was faulty. A credit note keeps the accounts straight and still offers the refund.",
    levi: "A credit note, with the refund still offered." },
  { av: "NM", kind: "Invoice", meta: "Nandini Mehta · final notice", age: "61d overdue",
    draft: "Hello — invoice 0128 is sixty-one days overdue and I have not been able to reach anyone. Before this goes further I would like to speak to someone. Is there a better number than the one on file?",
    why: "Two reminders and no reply. Drafted as a request for a conversation rather than a threat, which is where you have stopped before.",
    levi: "Sixty-one days. This one needs you, not another email." },
  { av: "FS", kind: "Invoice", meta: "Fairlane Studio · October retainer", age: "Due in 30d",
    draft: "Invoice 0152 for the October retainer, due in thirty days. Same line items and rate as September.",
    why: "October is marked complete and Fairlane is billed monthly on unchanged terms.",
    levi: "Same as every month. It only needs your yes." },

  /* ---- social posts ------------------------------------------------------ */
  { av: "SP", kind: "Social post", meta: "Draft · the oak sideboard", age: "Queued Tue",
    draft: "Eight weeks, one board, and a lot of arguing about the handles. The oak sideboard is finished and going to its new home in Bandra on Friday.",
    why: "Photographs were taken yesterday and the piece ships Friday, so the timing works. Written the way you write, not the way a brand writes.",
    levi: "Photos are from yesterday. It ships before this posts." },
  { av: "SP", kind: "Social post", meta: "Draft · workshop, Saturday", age: "Queued Fri",
    draft: "The workshop is open this Saturday from ten. No appointment, no pressure — come and look at the joints if that is your idea of a good morning.",
    why: "Saturday opening is already on the calendar. The tone matches the posts that have done best.",
    levi: "Already on your calendar. This only announces it." },
  { av: "SP", kind: "Social post", meta: "Draft · behind the scenes", age: "Queued Mon",
    draft: "What three hundred hand-cut dovetails look like before anyone sees them. Most of this job is invisible once the drawer is in.",
    why: "There are eleven unused process photographs from the Worli job. This uses one rather than letting them sit.",
    levi: "You have eleven unused process shots. This uses one." },
  { av: "SP", kind: "Social post", meta: "Draft · new timber delivery", age: "Queued Wed",
    draft: "Two hundred feet of walnut arrived this morning. If you have been waiting for a walnut slot, this is the one to ask about.",
    why: "The delivery is logged and three people are on the walnut waiting list. The post doubles as their answer.",
    levi: "Three people are waiting on walnut. This tells them." },
  { av: "SP", kind: "Social post", meta: "Draft · finished commission", age: "Queued Thu",
    draft: "The reading chair, finished. Built for someone who reads for four hours at a stretch and wanted arms at exactly the right height for a book.",
    why: "The client agreed to photographs when the order was placed, and that consent is on the record.",
    levi: "Photo consent is on the order. You are clear to post." },
  { av: "SP", kind: "Social post", meta: "Draft · reply to a comment", age: "1h",
    draft: "It is Indian rosewood, and yes — that grain is from a single board. Thank you for noticing, most people do not.",
    why: "A question on last week's post with no reply yet. Short, because the comment was short.",
    levi: "Unanswered since Tuesday. Short question, short answer." },
  { av: "SP", kind: "Social post", meta: "Draft · year mark", age: "Queued Sun",
    draft: "Six years of the workshop this week. Thirty-one commissions this year, one broken bandsaw, and no regrets about leaving the desk job.",
    why: "The commission count comes from your own records. The rest is from what you have written before about the anniversary.",
    levi: "Thirty-one is from your records, not a round number." },

  /* ---- memory and priorities --------------------------------------------- */
  { av: "!", kind: "Reminder", meta: "Insurance renewal · 11 days", age: "Due 30 Sep",
    draft: "Workshop insurance renews on the thirtieth. Last year you meant to compare quotes and ran out of time. Eleven days is enough to do it properly this time.",
    why: "The renewal date is on file and last year's note says the same thing happened. Raised now rather than on the day.",
    levi: "This caught you out last year. Eleven days is enough." },
  { av: "!", kind: "Reminder", meta: "Rohan's bench · final coat", age: "Tomorrow",
    draft: "The walnut bench needs its last coat tomorrow to be dry for Thursday collection. Nothing else is booked into the finishing bay.",
    why: "Collection is promised for Thursday and the drying time is twenty-four hours. The bay is free, so this is only a nudge.",
    levi: "Thursday collection is promised. Tomorrow is the last day." },
  { av: "!", kind: "Reminder", meta: "GST filing · quarter close", age: "Due 20 Oct",
    draft: "Quarterly filing is due on the twentieth. Your accountant usually wants everything by the fifteenth, which is three weeks away.",
    why: "Both dates are from previous quarters. Flagged early because the last two were done in a rush.",
    levi: "Your accountant wants it by the fifteenth, not the twentieth." },
  { av: "!", kind: "Reminder", meta: "Follow up · Ishaan's alcove", age: "3d since reply",
    draft: "Ishaan answered your two questions three days ago and has not heard back. The quote is the only thing outstanding.",
    why: "He replied promptly and the thread has gone quiet on your side. This is the kind of lead that goes cold in a week.",
    levi: "He replied in an hour. You have had it three days." },
  { av: "!", kind: "Reminder", meta: "Bandsaw blade · reorder", age: "Low stock",
    draft: "You are on your last bandsaw blade. The supplier takes four days and you have two jobs that need resawing next week.",
    why: "The last order was logged three months ago and the usage since then says this is the last one.",
    levi: "Last blade, four-day supplier, two jobs next week." },
  { av: "!", kind: "Reminder", meta: "Deposit not chased · Sunil", age: "6d",
    draft: "Sunil's deposit invoice went out six days ago and has not cleared. His slot starts in two weeks and nothing is cut until it does.",
    why: "The invoice is unpaid and the workshop slot is booked. Raised because the slot is the thing at risk, not the money.",
    levi: "The slot is the risk here, not the money." },
  { av: "!", kind: "Reminder", meta: "Photographs · Worli job", age: "Before Friday",
    draft: "The Worli fit-out is collected on Friday and has not been photographed. It is the biggest thing you have built this year.",
    why: "No photographs are attached to the job and it leaves in three days. Once it is gone, it is gone.",
    levi: "It leaves Friday. After that there is nothing to photograph." },
  { av: "!", kind: "Reminder", meta: "Anita's drawing · promised", age: "2d",
    draft: "You offered Anita a seat-height drawing two days ago and she said yes. It has not been sent.",
    why: "The offer is in the thread and she accepted it. Small, but it was promised.",
    levi: "You promised this one. It is small and it is overdue." },
  { av: "!", kind: "Reminder", meta: "Quiet week · October", age: "Planning",
    draft: "The third week of October has nothing booked into the workshop. Two people asked for earlier slots and were told eleven weeks.",
    why: "The schedule shows the gap and the enquiry list shows who wanted it. Nothing is promised to anyone yet.",
    levi: "There is a hole in October and two people who wanted it." },

  /* ---- more inbox triage, the long tail ---------------------------------- */
  { av: "KB", kind: "Email reply", meta: "Kavya Bose · payment plan", age: "1d",
    draft: "Hi Kavya — we can split it across three months, interest free. Nothing changes about the piece or the timeline. Shall I redo the invoice that way?",
    why: "You have done three-month splits before for commissions this size. The question keeps the decision with her.",
    levi: "You have split payments before. Same terms as last time." },
  { av: "AR", kind: "Email reply", meta: "Amit Rao · warranty question", age: "5h",
    draft: "Hi Amit — everything is guaranteed for five years against anything that is our fault, which in practice means joints and finish. Wear is not covered, and honestly it usually looks better.",
    why: "Five years is what the order paperwork says. The last line is how you have answered this before.",
    levi: "Five years is on the paperwork. I did not soften it." },
  { av: "ZH", kind: "Email reply", meta: "Zara Hussain · rush order", age: "2h",
    draft: "Hi Zara — three weeks is not possible for the full set, but two chairs by then is. I would rather offer you something real than agree and disappoint you.",
    why: "The schedule will not take the full order in three weeks. Partial delivery is what the bench capacity actually allows.",
    levi: "Three weeks will not happen. Two chairs will." },
  { av: "VN", kind: "Email reply", meta: "Vikram Nair · timber sourcing", age: "1d",
    draft: "Hi Vikram — everything comes from two mills, both in Maharashtra, and I can tell you which board your piece came from. Happy to send the paperwork if you want it.",
    why: "Sourcing is already documented per job, so the offer at the end is something you can actually honour.",
    levi: "You can honour that last offer. The paperwork exists." },
  { av: "SM", kind: "Email reply", meta: "Sara Malik · showroom visit", age: "6h",
    draft: "Hi Sara — there is no showroom, only the workshop, and it is usually covered in sawdust. You are very welcome to visit anyway if that does not put you off.",
    why: "There is no showroom and pretending otherwise causes a wasted trip. The tone is yours.",
    levi: "No showroom. Better she hears that now than on arrival." },
  { av: "GT", kind: "Email reply", meta: "Gaurav Tiwari · bulk enquiry", age: "3h",
    draft: "Hi Gaurav — forty units is beyond what one workshop can do well in the time you need. I would rather point you to someone set up for it than take it and do it badly.",
    why: "Forty units against current capacity is not achievable. Declining is drafted because you have declined this before.",
    levi: "This one is a no. I drafted it as a no." },
  { av: "PD", kind: "Email reply", meta: "Pooja Deshmukh · thank you", age: "1d",
    draft: "Pooja — thank you, that is lovely to hear. I will pass it on to Ganesh, who did most of the drawer work you are describing.",
    why: "Praise rather than a request. Short, and it credits the person who did the work.",
    levi: "Nothing to action. It just deserves a reply." },
  { av: "HN", kind: "Email reply", meta: "Hemant Naik · wrong address", age: "4h",
    draft: "Hemant — caught it before dispatch, nothing has shipped. I have updated it to the Chembur address. Confirm that is right and it goes out tomorrow.",
    why: "The order is still marked as packing, so the change is free to make. Confirmation is asked for because an address was already wrong once.",
    levi: "Caught before dispatch. It costs nothing to change now." }
];

/* ---------------------------------------------------------------------------
   Rendering. Cloned from the shape of the cards already in index.html so the
   existing queue behaviour - approve, edit, skip, the counter, the record and
   the reset - picks them up with no changes at all.

   Appended BEFORE site.js initialises, so the count is right on the first
   paint and nothing has to be told to refresh.
   ------------------------------------------------------------------------ */
(function () {
  "use strict";
  var stack = document.querySelector("[data-stack]");
  if (!stack || !window.COGNIVEX_QUEUE) return;

  var frag = document.createDocumentFragment();

  var ALL = window.COGNIVEX_QUEUE.concat(window.COGNIVEX_QUEUE_EXTRA || []);
  ALL.forEach(function (it) {
    var li = document.createElement("li");
    li.className = "card";
    li.setAttribute("data-item", "");
    li.setAttribute("data-levi", it.levi || "");

    var top = document.createElement("div");
    top.className = "card__top";
    top.innerHTML =
      '<span class="card__avatar" aria-hidden="true"></span>' +
      '<div class="card__id">' +
        '<p class="card__kind mono" data-kind></p>' +
        '<p class="card__meta mono" data-meta></p>' +
      '</div>' +
      '<span class="card__age mono"></span>';
    top.querySelector(".card__avatar").textContent = it.av;
    top.querySelector("[data-kind]").textContent = it.kind;
    top.querySelector("[data-meta]").textContent = it.meta;
    top.querySelector(".card__age").textContent = it.age;

    var body = document.createElement("div");
    body.className = "card__body";
    var draft = document.createElement("p");
    draft.className = "card__draft";
    draft.setAttribute("data-draft", "");
    draft.textContent = it.draft;
    var why = document.createElement("p");
    why.className = "card__why";
    var b = document.createElement("b");
    b.textContent = "Why this draft";
    why.appendChild(b);
    why.appendChild(document.createTextNode(it.why));
    body.appendChild(draft);
    body.appendChild(why);

    var acts = document.createElement("div");
    acts.className = "card__actions";
    acts.innerHTML =
      '<button class="btn btn--accent" type="button" data-approve>Approve and send</button>' +
      '<button class="btn btn--quiet" type="button" data-edit>Edit</button>' +
      '<button class="btn btn--quiet" type="button" data-skip>Skip</button>';

    li.appendChild(top);
    li.appendChild(body);
    li.appendChild(acts);
    frag.appendChild(li);
  });

  stack.appendChild(frag);
})();
