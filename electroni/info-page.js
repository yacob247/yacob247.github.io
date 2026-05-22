(function(){
  const pages = {
    platform: {
      eyebrow: "Platform",
      title: "A focused Year 12 learning platform.",
      intro: "Electroni brings subjects, lessons, progress, missed work, and reminders into one student workspace built for final-year study.",
      items: [
        ["Course workspace", "Students open approved Year 12 subjects, move through topics, save notes, complete quizzes, and return to exact lessons."],
        ["Progress logic", "Completion is calculated from lesson activity and quiz results so students can see what is ready and what still needs attention."],
        ["Reminder engine", "Deterministic reminder rules track selected work, due dates, and missed work without relying on a chatbot."]
      ]
    },
    features: {
      eyebrow: "Features",
      title: "Tools for staying on top of Year 12.",
      intro: "The feature set is built around practical study behaviour: open work, finish it, revise it, and get reminded before it slips.",
      items: [
        ["Missed work tracking", "Opened work becomes missed only when its due date passes and it is still incomplete."],
        ["Manual reminders", "Students can choose subjects, topics, and lessons, then save a reminder that emails their account."],
        ["Teacher assignment dates", "Teacher-assigned due dates feed the same missed-work algorithm used on course and reminder pages."]
      ]
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Simple paid access for Year 12 subjects.",
      intro: "Electroni is designed around approved paid subject access. Students only see the courses unlocked on their account.",
      items: [
        ["Student", "Monthly paid access to selected Year 12 subjects, lessons, quizzes, notes, reminders, and progress tracking."],
        ["School", "School access can include teacher controls, class assignment dates, and managed student access."],
        ["Support", "Contact the team for help with subject access, school setup, or payment confirmation."]
      ]
    },
    "mobile-app": {
      eyebrow: "Mobile App",
      title: "Study from the browser on any device.",
      intro: "The current Electroni experience is responsive for phones, tablets, and desktops. A dedicated mobile app can build on the same course and reminder data.",
      items: [
        ["Responsive lessons", "Subject pages adapt to smaller screens so students can review lessons and notes away from a desktop."],
        ["Reminder-ready", "Saved reminders keep the same selected subjects, topics, lessons, due date, and email target."],
        ["Future app path", "The existing data model is ready for a dedicated app wrapper when the product moves beyond the web version."]
      ]
    },
    company: {
      eyebrow: "Company",
      title: "Built around focused final-year learning.",
      intro: "Electroni is a compact learning product for Year 12 students who need clear lessons, less noise, and better follow-through.",
      items: [
        ["Mission", "Help students know exactly what to study next and what they still owe."],
        ["Approach", "Keep the platform practical: approved subjects, direct lessons, progress, and reminders."],
        ["Contact", "Use the contact page for support, partnerships, schools, or account questions."]
      ]
    },
    about: {
      eyebrow: "About Us",
      title: "Electroni is made for Year 12 momentum.",
      intro: "The platform focuses on final-year students and the day-to-day study loop: watch, read, answer, complete, revise, and recover missed work.",
      items: [
        ["Year 12 first", "The product language and subject library now focus on Year 12."],
        ["Student clarity", "Every subject page aims to make the current lesson, topic, due date, and next action easy to see."],
        ["Practical automation", "Reminder and missed-work systems use clear rules rather than generative AI."]
      ]
    },
    careers: {
      eyebrow: "Careers",
      title: "Help build better Year 12 study tools.",
      intro: "Electroni is not listing formal roles on this static page yet, but this is the home for future product, content, teaching, and engineering opportunities.",
      items: [
        ["Content", "Curriculum writers and teachers can help shape lesson structure and topic coverage."],
        ["Product", "Design and engineering work focuses on calm, useful student workflows."],
        ["Schools", "School partnerships can support managed access and better assignment workflows."]
      ]
    },
    blog: {
      eyebrow: "Blog",
      title: "Study notes, product updates, and Year 12 advice.",
      intro: "This page is ready for Electroni articles and updates. Use it for study guidance, release notes, and subject-specific support.",
      items: [
        ["Study systems", "Articles can explain revision planning, due-date habits, and missed-work recovery."],
        ["Subject updates", "New Year 12 content and changes can be announced here."],
        ["Product notes", "Reminder, progress, and access updates can be documented for students and schools."]
      ]
    },
    legal: {
      eyebrow: "Legal",
      title: "Electroni legal information.",
      intro: "Find the main policy pages for using Electroni, including privacy, terms, and cookies.",
      items: [
        ["Privacy Policy", "How Electroni handles account, learning, reminder, and contact information."],
        ["Terms of Service", "The rules for access, subscriptions, acceptable use, and course materials."],
        ["Cookie Policy", "How local storage, browser data, and similar technologies support the product."]
      ]
    },
    privacy: {
      eyebrow: "Privacy Policy",
      title: "How Electroni handles student information.",
      intro: "Electroni uses account, subject, progress, reminder, and contact information to provide the learning service.",
      items: [
        ["Account data", "Email, name, role, selected subjects, and approval status are used for access and support."],
        ["Learning data", "Progress, opened lessons, completion, notes, reminders, and missed-work status support the student dashboard."],
        ["Emails", "Reminder and account emails are sent to the address saved by the student or account holder."]
      ]
    },
    terms: {
      eyebrow: "Terms of Service",
      title: "Rules for using Electroni.",
      intro: "Using Electroni means using approved access responsibly and keeping course materials inside the platform.",
      items: [
        ["Access", "Subject access depends on account approval and paid or school-managed access."],
        ["Use", "Students should use lessons, quizzes, notes, reminders, and materials for personal study."],
        ["Changes", "Content, pricing, and features may change as Electroni improves the Year 12 experience."]
      ]
    },
    cookies: {
      eyebrow: "Cookie Policy",
      title: "Browser storage used by Electroni.",
      intro: "Electroni uses browser storage to keep login state, selected subjects, progress, reminder settings, and local preferences available between visits.",
      items: [
        ["Local storage", "Progress, reminders, account state, and selected settings may be stored in the browser."],
        ["Service data", "Some settings may also sync to Firebase or email systems when configured."],
        ["Control", "Clearing browser data may remove local progress or saved reminder settings on that device."]
      ]
    }
  };

  function pageKey(){
    return document.body.dataset.page || location.pathname.split("/").pop().replace(/\.html$/, "") || "platform";
  }

  function render(){
    const page = pages[pageKey()] || pages.platform;
    document.title = `${page.eyebrow} - Electroni`;
    document.body.innerHTML = `
      <nav>
        <a href="electroni.html" class="logo">Electron<span>i</span></a>
        <div class="nav-links">
          <a href="platform.html">Platform</a>
          <a href="features.html">Features</a>
          <a href="subjects.html">Subjects</a>
          <a href="pricing.html">Pricing</a>
          <a href="contact.html">Contact</a>
          <a href="login.html">Account</a>
        </div>
      </nav>
      <main>
        <section class="hero">
          <div class="hero-inner">
            <div class="eyebrow">${page.eyebrow}</div>
            <h1>${page.title}</h1>
            <p>${page.intro}</p>
            <div class="actions">
              <a class="btn primary" href="signup.html">Get started</a>
              <a class="btn ghost" href="subjects.html">View subjects</a>
            </div>
          </div>
        </section>
        <section class="section">
          <div class="section-inner">
            <h2>${page.eyebrow}</h2>
            <div class="grid">
              ${page.items.map(item => `<article class="item"><h3>${item[0]}</h3><p>${item[1]}</p></article>`).join("")}
            </div>
          </div>
        </section>
      </main>
      <footer>
        <div class="footer-inner">
          <span>Electroni Learning for Year 12.</span>
          <div class="footer-links">
            <a href="privacy.html">Privacy</a>
            <a href="terms.html">Terms</a>
            <a href="cookies.html">Cookies</a>
          </div>
        </div>
      </footer>
    `;
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
