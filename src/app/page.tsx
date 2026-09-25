import Image from "next/image";
import Link from "next/link";

import { EmailSignupForm } from "@/components/email-signup-form";
import { getHomeData, type FeedEvent } from "@/components/home/home-data";
import styles from "@/components/home/home.module.css";
import { LivePanel } from "@/components/home/live-panel";
import type { PublicCreator } from "@/lib/db/queries";
import { formatTimeAgo } from "@/lib/time-ago";
import { dicebearUrl } from "@/lib/unavatar";

// Home — V3 (DESIGN.md § Page Inventory, DECISIONS.md § 2026-09-24). A static
// explainer on real data; the battle itself lives at /arena. Reads are cached
// for a minute (home-data.ts), so the page is cheap for every visitor.
export const dynamic = "force-dynamic";

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

function avatarOf(c: { avatarUrl: string | null; username: string }) {
  return c.avatarUrl ?? dicebearUrl(c.username);
}

function Face({ c, className, size }: { c: { avatarUrl: string | null; username: string; name: string }; className?: string; size: number }) {
  return (
    <Image
      src={avatarOf(c)}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={cx(styles.face, className)}
    />
  );
}

function ArrowUpRight() {
  return (
    <svg className={styles.arrow} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg className={styles.arrow} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fmt = (n: number) => n.toLocaleString("en-US");

/** DESIGN.md § Aura and Hype icons — Aura is always 🔥, Hype always ⚡. */
function Fire() {
  return (
    <span className={styles.emo} aria-hidden="true">
      🔥
    </span>
  );
}
function Bolt() {
  return (
    <span className={styles.emo} aria-hidden="true">
      ⚡
    </span>
  );
}

function FeedIcon({ kind }: { kind: FeedEvent["kind"] }) {
  if (kind === "aura") {
    return (
      <span className={cx(styles.emo, styles.feedEmo)} aria-hidden="true">
        🔥
      </span>
    );
  }
  if (kind === "beat") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 4l9.5 9.5M4 4h3.5L17 13.5M4 4v3.5L13.5 17M20 4l-6.5 6.5M14.5 17.5l3 3 3-3-3-3M9.5 17.5l-3 3-3-3 3-3"
          stroke="#8C97AC"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"
        stroke="#2FB757"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Who({ name, username }: { name: string; username: string }) {
  return username ? (
    <Link href={`/c/${username}`}>
      <b>{name}</b>
    </Link>
  ) : (
    <b>{name}</b>
  );
}

function FeedLine({ e }: { e: FeedEvent }) {
  if (e.kind === "join") {
    return (
      <p>
        <Who name={e.name} username={e.username} /> entered the <b>Arena</b>
      </p>
    );
  }
  if (e.kind === "aura") {
    return (
      <p>
        <Who name={e.name} username={e.username} /> reached <b>{fmt(e.aura)} Aura</b>
      </p>
    );
  }
  return (
    <p>
      <Who name={e.name} username={e.username} /> defeated <Who name={e.loserName} username={e.loserUsername} />
    </p>
  );
}

function MiniCard({ c }: { c: PublicCreator }) {
  return (
    <Link href="/arena" className={styles.mini}>
      <Image src={avatarOf(c)} alt="" width={160} height={109} unoptimized />
      <div>
        <b>{c.name}</b>
        <i>@{c.username}</i>
        {c.category && <span>{c.category}</span>}
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const { topWeek, live, onlineNow, feed, featured } = await getHomeData();
  const one = topWeek[0] ?? null;
  const pileFaces = topWeek.slice(0, 4);
  const morePile = Math.max(0, live.creators.total - pileFaces.length);
  const orbitFaces = (topWeek.length > 4 ? topWeek.slice(4, 7) : topWeek.slice(0, 3)).slice(0, 3);
  const dropFaces = topWeek.slice(1, 4);
  const backdrop = one ?? featured?.[0] ?? null;

  return (
    <main className={styles.wrap}>
      <div className={styles.home}>
        {/* Row 1: pitch, the week's #1, top 10 */}
        <div className={cx(styles.row, styles.r1)}>
          <section className={cx(styles.card, styles.hero)} aria-label="What Underhyped is">
            <div className={styles.heroCopy}>
              <span className={styles.chip}>Real creators. More eyes.</span>
              <h1>
                The internet <em>misses a lot.</em>
              </h1>
              <p className={styles.lede}>
                Underhyped is a community-powered arena for underrated creators. Discover, support, and give them the hype they
                deserve.
              </p>
              <div className={styles.ctas}>
                <Link className={cx(styles.btn, styles.btnLime)} href="/arena">
                  Start Hyping <ArrowUpRight />
                </Link>
                <Link className={cx(styles.btn, styles.btnGhost)} href="/nominate">
                  Nominate Someone
                </Link>
              </div>
              {pileFaces.length > 0 && (
                <div className={styles.join}>
                  <div className={styles.pile}>
                    {pileFaces.map((c) => (
                      <Face key={c.id} c={c} size={38} />
                    ))}
                    {morePile > 0 && <span className={styles.pileMore}>+{fmt(morePile)}</span>}
                  </div>
                  <p>Join a growing community of builders, creators and believers.</p>
                </div>
              )}
            </div>

            {one ? (
              <article className={styles.one} aria-label={`Number one this week: ${one.name}`}>
                <Image src={avatarOf(one)} alt="" fill sizes="320px" unoptimized />
                <span className={styles.oneRank}>#1</span>
                <h3>
                  <Link href={`/c/${one.username}`}>{one.name}</Link>
                </h3>
                <p className={styles.at}>@{one.username}</p>
                {one.bio && <p className={styles.bio}>{one.bio}</p>}
                {one.category && (
                  <div className={styles.tags}>
                    <span>{one.category}</span>
                  </div>
                )}
                <div className={styles.oneStats}>
                  <span>
                    <Fire />
                    {fmt(one.aura)} Aura
                  </span>
                  <span>
                    <Bolt />
                    {fmt(one.winsCount)} Hype
                  </span>
                </div>
              </article>
            ) : (
              <article className={styles.one} aria-label="Number one this week">
                <h3>The first #1 is still being decided.</h3>
                <p className={styles.bio}>Creators get a rank after 10 battles. Go hype someone.</p>
              </article>
            )}
          </section>

          <section className={cx(styles.card, styles.top)} aria-label="Top 10 this week">
            <div className={styles.head}>
              <h2>Top 10 This Week</h2>
              <Link className={styles.link} href="/leaderboard">
                View all <ArrowRight />
              </Link>
            </div>
            {topWeek.length > 0 ? (
              <ol className={styles.ranks}>
                {topWeek.slice(0, 5).map((c, i) => (
                  <li key={c.id}>
                    <Link className={cx(styles.rank, i === 0 && styles.isFirst)} href={`/c/${c.username}`}>
                      <span className={cx(styles.no, i === 0 && styles.gold, i === 1 && styles.silver, i === 2 && styles.bronze)}>
                        {i + 1}
                      </span>
                      <Face c={c} size={38} />
                      <span>
                        <b>{c.name}</b>
                        <small>{c.bio ?? c.category ?? `@${c.username}`}</small>
                      </span>
                      <span className={styles.score}>
                        <Fire />
                        {fmt(c.aura)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.lede}>Nobody&rsquo;s ranked yet this week. The board fills as battles land.</p>
            )}
            <Link className={styles.wide} href="/leaderboard">
              View full leaderboard <ArrowRight />
            </Link>
          </section>
        </div>

        {/* Weekly drop — email capture */}
        <section className={styles.drop} aria-label="Weekly creator email">
          <span className={styles.dropIco} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="2.5" y="4.5" width="19" height="15" rx="3" fill="#111" />
              <path d="m5.5 8 6.5 5 6.5-5" stroke="#D8FF3E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className={styles.dropCopy}>
            <span className={cx(styles.chip, styles.chipLime)}>Get the Underhyped drop</span>
            <h2>5 creators worth knowing, delivered weekly.</h2>
            <p>Curated by the community. No spam, just talent.</p>
          </div>
          <div className={styles.dropOrbit} aria-hidden="true">
            <svg className={styles.lines} viewBox="0 0 150 150" preserveAspectRatio="none" fill="none">
              <path d="M42 0v44l-8 60 6 46M120 0v42L40 44M34 104l86-62M120 42l20 108" stroke="currentColor" strokeWidth="1" />
            </svg>
            {dropFaces.map((c, i) => (
              <Face key={c.id} c={c} size={62} className={[styles.d1, styles.d2, styles.d3][i]} />
            ))}
          </div>
          <div className={styles.dropCta}>
            <EmailSignupForm source="drop" />
          </div>
          <span className={styles.dropScrawl} aria-hidden="true">
            Discover
            <br />
            before
            <br />
            everyone else.
            <svg viewBox="0 0 20 26" fill="none">
              <path d="M6 2c8 4 10 10 3 13-6 3-2 8 5 9" stroke="#8FB811" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </section>

        {/* Row 2: live numbers, enter CTA */}
        <div className={cx(styles.row, styles.r2)}>
          <LivePanel counts={live} initialOnline={onlineNow} />

          <section className={cx(styles.card, styles.cta)} aria-label="Enter the Arena">
            <div className={styles.ctaPanel}>
              <div className={styles.ctaTop}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#111" d="M13.5 1.5 4 13.5h6.5L9.5 22.5 20 9.5h-6.8z" />
                </svg>
                <p>
                  Underrated talent
                  <br />
                  deserves a bigger stage.
                </p>
              </div>
              <Link className={cx(styles.btn, styles.btnDark)} href="/submit">
                Enter the Arena <ArrowUpRight />
              </Link>
              <div className={styles.ctaFoot}>
                <div className={styles.pile}>
                  {topWeek.slice(0, 4).map((c) => (
                    <Face key={c.id} c={c} size={30} />
                  ))}
                </div>
                <p>
                  {fmt(live.creators.total)} {live.creators.total === 1 ? "creator has" : "creators have"} joined the movement.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Row 3: live feed, featured battle */}
        <div className={cx(styles.row, styles.r3)}>
          <section className={cx(styles.card, styles.feed)} aria-label="Live feed">
            <div className={styles.head}>
              <div className={styles.feedTitle}>
                <span className={styles.pulse}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M2.5 12h4l2.5-6 4.5 12 2.5-6h5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <h2>Live Feed</h2>
                  <p>Real activity. Real people. Real progress.</p>
                </div>
              </div>
              <Link className={styles.link} href="/arena">
                View all <ArrowRight />
              </Link>
            </div>
            {feed.length > 0 ? (
              <ul>
                {feed.map((e) => (
                  <li key={`${e.kind}-${e.at}-${e.username}`}>
                    <FeedIcon kind={e.kind} />
                    <Face c={e} size={32} />
                    <FeedLine e={e} />
                    <time dateTime={e.at}>{formatTimeAgo(new Date(e.at))}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.lede}>Quiet in here. The first hype of the day is yours.</p>
            )}
          </section>

          <section className={cx(styles.card, styles.feat)} aria-label="Featured battle">
            {backdrop && (
              <Image className={styles.featPhoto} src={avatarOf(backdrop)} alt="" width={600} height={420} unoptimized />
            )}
            <div className={styles.featCopy}>
              <span className={cx(styles.chip, styles.chipLime)}>Featured battle</span>
              <h2>Pick who deserves more hype.</h2>
              <p>Discover two creators. Pick the one making a bigger impact.</p>
              <Link className={cx(styles.btn, styles.btnLime)} href="/arena">
                Start Hyping <ArrowUpRight />
              </Link>
            </div>
            <div className={styles.featSide}>
              <p className={styles.note}>
                Real creators.
                <br />
                Real discovery.
                <br />
                Less hype, more talent.
                <svg viewBox="0 0 26 40" fill="none" aria-hidden="true">
                  <path d="M6 4l3 7M16 14l8-3M14 22l8 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </p>
              {featured && (
                <div className={styles.vsBox}>
                  <div className={styles.vsPair}>
                    <MiniCard c={featured[0]} />
                    <span className={styles.vs}>VS</span>
                    <MiniCard c={featured[1]} />
                  </div>
                  <Link className={styles.vsBar} href="/arena">
                    Pick who deserves more hype <ArrowRight />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Row 4: nominate */}
        <section className={styles.banner} aria-label="Nominate a creator">
          <div>
            <span className={cx(styles.chip, styles.chipLime)}>Be part of it</span>
            <h2>Nominate a creator who&rsquo;s flying under the radar.</h2>
            <p>Know someone who deserves more attention? Put them on the map.</p>
          </div>
          <div className={styles.orbit} aria-hidden="true">
            <svg className={styles.lines} viewBox="0 0 290 132" preserveAspectRatio="none" fill="none">
              <path d="M21 0v35l14 52 43 45M135 0v22l-57 71M21 35l114-13M78 93l30 39" stroke="currentColor" strokeWidth="1" />
            </svg>
            {orbitFaces.map((c, i) => (
              <Face key={c.id} c={c} size={58} className={[styles.o1, styles.o2, styles.o3][i]} />
            ))}
            <svg className={styles.scrawlArrow} viewBox="0 0 50 40" fill="none">
              <path d="M3 36C14 32 28 22 42 7M31 6l11 1-2 11" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={styles.scrawl}>
              More talent
              <br />
              less hype
            </span>
          </div>
          <Link className={cx(styles.btn, styles.btnDark)} href="/nominate">
            Nominate Someone <ArrowUpRight />
          </Link>
        </section>
      </div>
    </main>
  );
}
