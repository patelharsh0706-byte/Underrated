"use client";

import { useState } from "react";

import { rankDemos, type RankedDemo, type UnrankedDemo } from "@/lib/demos/rank";

import { useDemos } from "./demos-state";
import { DemosTabs } from "./demos-tabs";
import s from "./demos.module.css";
import { CATEGORIES, type SampleDemo } from "./sample-demos";

// "Top demos this week" — the Leaderboard's hero, chips, podium and ranked
// table, with ⚡ % as the score (RANKING.md § Demos). Ported from the artifact.
const PAGE = 5;
type Tally = SampleDemo & { underhyped: number };

function Logo({ d, className }: { d: SampleDemo; className: string }) {
  return (
    <span className={`${className} ${s.dmLogo}`} style={{ background: d.color }}>
      {d.name[0]}
    </span>
  );
}

function Score({ pct }: { pct: number }) {
  return (
    <>
      <span className={s.flame}>⚡</span>
      {pct}%
    </>
  );
}

function Trend({ v, className }: { v: number; className: string }) {
  if (v > 0) return <span className={`${className} ${s.up}`}>↑ +{v}</span>;
  if (v < 0) return <span className={`${className} ${s.down}`}>↓ −{Math.abs(v)}</span>;
  return <span className={className}>—</span>;
}

function PodCard({ d, rank }: { d: RankedDemo<Tally>; rank: number }) {
  const first = rank === 1;
  return (
    <article className={`${s.pod} ${first ? s.podFirst : ""}`}>
      <span className={s.podNo}>{rank}</span>
      <div className={s.podTop}>
        <Logo d={d} className={s.podFace} />
        <div className={s.podScore}>
          {first && (
            <span className={s.podCrown}>
              <svg viewBox="0 0 24 18" fill="none" aria-hidden="true">
                <path d="M2 15L4 3l5 6 3-7 3 7 5-6 2 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              most underhyped
              <br />
              demo this week.
            </span>
          )}
          <b>
            <Score pct={d.pct} />
          </b>
          <Trend v={d.trend} className={s.podTrend} />
        </div>
      </div>
      <h3>{d.name}</h3>
      <p className={s.handle}>
        {d.host} · {d.judges.toLocaleString("en-US")} judges
      </p>
      <p className={s.bio}>{d.tag}</p>
      <span className={s.catChip}>{d.cat}</span>
    </article>
  );
}

function Row({ d, rank, you }: { d: RankedDemo<Tally> | UnrankedDemo<Tally>; rank: number | null; you: boolean }) {
  const rankCls = rank && rank <= 3 ? [s.rank1, s.rank2, s.rank3][rank - 1] : "";
  return (
    <div className={`${s.rank} ${rankCls} ${you ? s.dmYou : ""}`}>
      <span className={s.rankNo}>{rank ?? "–"}</span>
      <span className={s.rankWho}>
        <Logo d={d} className={s.rankFace} />
        <span className={s.rankText}>
          <span className={s.rankLine}>
            <b>{d.name}</b>
            <i>{d.host}</i>
          </span>
          <span className={s.rankBio}>{d.tag}</span>
        </span>
      </span>
      <span className={s.catChip}>{d.cat}</span>
      {rank ? (
        <>
          <span className={s.rankAura}>
            <Score pct={d.pct} />
          </span>
          <Trend v={d.trend} className={s.rankTrend} />
        </>
      ) : (
        <>
          <span className={s.dmNeeds}>{"needs" in d ? d.needs : 0} more judges</span>
          <span className={s.rankTrend}>{d.judges}/20</span>
        </>
      )}
    </div>
  );
}

export function DemosTop() {
  const { demos, voted } = useDemos();
  const [cat, setCat] = useState<string>("all");
  const [shown, setShown] = useState(PAGE);

  const inCat = (d: SampleDemo) => cat === "all" || d.cat === cat;
  const { ranked, unranked } = rankDemos(demos.filter(inCat) as Tally[]);
  const hasPodium = ranked.length >= 3;
  const rest = hasPodium ? ranked.slice(3) : ranked;
  const visible = rest.slice(0, shown);
  const showing = (hasPodium ? 3 : 0) + visible.length;

  return (
    <>
      <section className={s.lbHero}>
        <p className={s.eyebrow}>Underhyped Demos · this week</p>
        <h1>
          Top <span className={s.swipe}>demos.</span>
        </h1>
        <p className={s.heroSub}>Ranked by the share of people who said Underhyped&nbsp;⚡. A demo needs 20 judges before it gets a rank.</p>
      </section>

      <DemosTabs center />

      <div className={s.filters}>
        {["all", ...CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            className={`${s.chip} ${cat === c ? s.isOn : ""}`}
            onClick={() => {
              setCat(c);
              setShown(PAGE);
            }}
          >
            {c === "all" ? "All demos" : c}
          </button>
        ))}
      </div>

      {hasPodium && (
        <section className={s.podium} aria-label="Top three demos">
          <PodCard d={ranked[1]} rank={2} />
          <PodCard d={ranked[0]} rank={1} />
          <PodCard d={ranked[2]} rank={3} />
        </section>
      )}

      <section className={s.top10} style={{ marginTop: 0 }}>
        <div className={`${s.ranks} ${s.dmRanks}`}>
          <div className={s.rankHead} aria-hidden="true">
            <span className={s.numCol}>#</span>
            <span>Product</span>
            <span>Category</span>
            <span>Underhyped</span>
            <span className={s.trendCol}>Today</span>
          </div>
          {visible.map((d) => (
            <Row key={d.id} d={d} rank={d.rank} you={!!voted[d.id]} />
          ))}
          {!ranked.length && <p className={s.lbEmpty}>No ranked demos in this category yet — be the first to judge one.</p>}
        </div>

        {unranked.length > 0 && (
          <div className={s.dmUnranked}>
            <p className={s.dmUnrankedH}>Not ranked yet · needs 20 judges</p>
            <div className={`${s.ranks} ${s.dmRanks}`}>
              {unranked.map((d) => (
                <Row key={d.id} d={d} rank={null} you={!!voted[d.id]} />
              ))}
            </div>
          </div>
        )}

        <div className={s.lbFoot}>
          {showing < ranked.length && (
            <button className={s.btnMore} type="button" onClick={() => setShown(shown + PAGE)}>
              Load more demos ↓
            </button>
          )}
          <p className={s.lbCount}>
            Showing {showing} of {ranked.length} ranked demos
          </p>
        </div>
      </section>
      <p className={s.dmNote} style={{ textAlign: "center" }}>
        Sample data for now. Your votes on the Judge tab move these numbers.
      </p>
    </>
  );
}
