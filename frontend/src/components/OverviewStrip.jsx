const showcaseCards = [
  {
    title: 'Budget intelligence',
    value: '7 planning inputs',
    detail: 'Helps users estimate spending pressure, savings rate, and monthly breathing room.',
  },
  {
    title: 'Market integration',
    value: 'Live Finnhub data',
    detail: 'React sends ticker requests to FastAPI, and FastAPI handles the external API layer.',
  },
  {
    title: 'Guided assistance',
    value: 'Rule-based coaching',
    detail: 'Turns income, goals, and risk comfort into beginner-friendly next steps.',
  },
  {
    title: 'Portfolio signal',
    value: 'Full-stack build',
    detail: 'Shows frontend/backend communication, financial logic, and practical UX thinking.',
  },
];

function OverviewStrip() {
  return (
    <section className="overview-strip" aria-label="Project highlights">
      {showcaseCards.map((card, index) => (
        <article className="overview-card" key={card.title} style={{ animationDelay: `${index * 90}ms` }}>
          <span>{card.title}</span>
          <strong>{card.value}</strong>
          <p>{card.detail}</p>
        </article>
      ))}
    </section>
  );
}

export default OverviewStrip;
