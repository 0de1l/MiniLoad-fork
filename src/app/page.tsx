import { HeroTitle, HeroSubtitle } from "@/components/hero-title";
import type { IconType } from "react-icons";
import {
  FiBookOpen,
  FiBox,
  FiCode,
  FiCommand,
  FiCpu,
  FiDatabase,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiImage,
  FiLayers,
  FiMapPin,
  FiMusic,
  FiRefreshCw,
  FiSettings,
  FiStar,
  FiTerminal,
  FiTool,
  FiUpload,
  FiVideo,
} from "react-icons/fi";
import Dither from "@/components/dither/Dither";
import Image from "next/image";
import { getHomeModules } from "@/lib/home-modules";
import { HomeToolIcon } from "@/lib/home-module-types";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const toolIconMap: Record<HomeToolIcon, IconType> = {
  file: FiFileText,
  layers: FiLayers,
  refresh: FiRefreshCw,
  video: FiVideo,
  book: FiBookOpen,
  command: FiCommand,
  link: FiExternalLink,
  code: FiCode,
  terminal: FiTerminal,
  tool: FiTool,
  database: FiDatabase,
  upload: FiUpload,
  download: FiDownload,
  image: FiImage,
  map: FiMapPin,
  music: FiMusic,
  box: FiBox,
  cpu: FiCpu,
  settings: FiSettings,
  star: FiStar,
};

const signalTags = ["BUILD", "WRITE", "PHOTO", "DAILY"];

const noise = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const cellShade = (seed: number) => {
  const r = noise(seed);
  if (r > 0.8) return 'bg-white/40';
  if (r > 0.6) return 'bg-white/20';
  if (r > 0.4) return 'bg-white/10';
  return 'bg-white/[0.03]';
};

const hexTag = (seed: number) => {
  const value = Math.floor(noise(seed) * 256);
  return value.toString(16).toUpperCase().padStart(2, '0');
};

export default async function Home() {
  const { tools, books } = await getHomeModules();

  return (
    <div className="container mx-auto max-w-5xl px-4">
      <div className="dither-background-wrapper">
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>
      {/* Hero Section */}
      <section className="mb-16 flex min-h-[40vh] flex-col items-center justify-center px-2 text-center sm:px-0">
        <HeroTitle />
        <div className="mt-6 text-muted-foreground">
          <HeroSubtitle />
        </div>
      </section>

      {/* 方案1: Status/Now 极简状态栏 */}
      <section className="mb-12 flex justify-center">
        <div className="flex items-center gap-6 px-4 py-2 rounded-full border border-white/10 bg-white/[0.07] backdrop-blur-md text-[10px] uppercase tracking-widest text-white/70 font-mono">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            STATUS: CODING
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <FiMapPin className="w-3 h-3 text-white/50" />
            YOUR_LOCATION
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <FiMusic className="w-3 h-3 text-white/50" />
            LO-FI BEATS
          </div>
        </div>
      </section>

      {/* 方案3: Daily Quote 像素风一言 */}
      <section className="flex flex-col items-center" style={{ marginBottom: 'calc(var(--spacing) * 50)' }}>
        <div className="max-w-xl w-full p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent relative group">
          <FiCommand className="absolute top-4 left-4 w-4 h-4 text-white/40" />
          <p className="font-press-start text-[10px] leading-relaxed text-center text-white/90 p-4">
            &ldquo;DARKNESS IS BOUNDLESS, YET HUMANITY FOOLISHLY YEARNS FOR LIGHT.&rdquo;
          </p>
          <div className="text-[10px] text-right text-white/50 font-mono mt-4">- OVERRIDE</div>
        </div>
      </section>

      <div className="space-y-24">
        {/* Featured Signal 模块 */}
        <section className="relative">
          <div className="relative overflow-hidden border border-white/10 bg-white/[0.035]">
            <span className="absolute right-0 top-0 h-5 w-5 border-r border-t border-white/30" />
            <div className="grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
              <div className="relative min-h-[260px] border-b border-white/10 bg-black/15 p-6 font-mono text-[11px] uppercase leading-loose text-white/60 md:border-b-0 md:border-r">
                <div className="absolute inset-0 bg-[linear-gradient(transparent_94%,rgba(255,255,255,0.055)_95%)] bg-[length:100%_16px] opacity-80" />
                <div className="relative">
                  <div>&gt; init module:minimal-load</div>
                  <div>&gt; source: github_pages + cloudflare</div>
                  <div>&gt; ui_stack: next.js / tailwind / motion</div>
                  <div>&gt; visual_core: dither_background + hud_panels</div>
                  <div>&gt; archive: posts + daily + moments</div>
                  <div className="mt-8 text-white/80">LAUNCH_MODULE: signal_room</div>
                  <div className="text-green-300">STATUS: RUNNING</div>
                </div>
              </div>

              <div className="relative flex min-h-[300px] flex-col justify-center p-6 sm:p-9">
                <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">0XML</div>
                <h2 className="font-press-start text-[clamp(1.55rem,5vw,3.6rem)] leading-[1.25] text-white/92">
                  MINIMAL
                  <br />
                  LOAD
                </h2>
                <p className="mt-8 max-w-xl text-[15px] leading-loose text-white/58 sm:text-base">
                  把折腾过的东西、偶尔的日常、喜欢的瞬间都放在这里。保持轻量，慢慢更新。
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {signalTags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-white/10 bg-white/[0.035] px-3 py-2 font-mono text-[10px] uppercase text-white/55"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 方案4: GitHub Contribution 模拟贡献墙 - HUD 风格 - 去边框去背景 */}
        <section className="relative group">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/70 font-mono">足迹</h2>
          </div>

          <div className="overflow-hidden p-1">
            <div className="grid grid-cols-[repeat(52,1fr)] gap-[2px]">
              {Array.from({ length: 52 * 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-[1px] transition-colors duration-500 ${cellShade(i + 1)}`}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center text-[9px] font-mono text-white/40 uppercase tracking-tighter">
            <span>Data_Stream_Initialized</span>
            <span>Check_sum: OK</span>
          </div>
        </section>

        {/* 工具集 Section - HUD 风格 - 去边框去背景 */}
        <section className="relative">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/70 font-mono">工具</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {tools.map((tool) => {
              const ToolIcon = toolIconMap[tool.icon] || FiFileText;

              return (
                <div
                  key={`${tool.id || tool.name}-${tool.name}`}
                  className="group/item relative p-5 transition-all duration-500"
                >
                  {/* Minimal Corner */}
                  <span className="absolute top-0 right-0 w-1 h-1 bg-white/10 group-hover/item:bg-white/40 transition-colors"></span>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="text-white/70 group-hover/item:text-white transition-colors">
                        <ToolIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[9px] font-mono text-white/40 group-hover/item:text-white/50">
                        0x{hexTag(tool.name.length + tool.description.length)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white/75 group-hover/item:text-white/95 mb-1 tracking-tight transition-colors">{tool.name}</h3>
                      <p className="text-[10px] text-white/60 leading-relaxed font-mono uppercase">{tool.description}</p>
                    </div>

                    <a
                      href={tool.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-[10px] font-mono text-white/60 hover:text-white pt-4 mt-2 group/btn"
                    >
                      <span>LAUNCH_MODULE</span>
                      <span className="group-hover/btn:translate-x-1 transition-transform">-&gt;</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 书架模块 */}
        <section className="relative">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/70 font-mono">书架</h2>
          </div>

          <div className="flex justify-start">
            {books.map((book) => (
              <article key={book.title} className="group/book relative w-[170px] sm:w-[190px]">
                <div className="relative overflow-hidden rounded-sm bg-white/[0.02] aspect-[3/4]">
                  <Image
                    src={book.cover}
                    alt={book.title}
                    width={480}
                    height={640}
                    className="h-full w-full object-contain object-left brightness-[0.82] saturate-[0.86] contrast-[0.94]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-black/18 transition-colors duration-300 group-hover/book:bg-black/8"></div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/28 via-black/12 to-transparent opacity-80"></div>
                  <div className="absolute inset-0 opacity-0 group-hover/book:opacity-100 transition-opacity duration-300 bg-black/25 backdrop-blur-md flex items-center justify-center p-4">
                    <p className="text-[11px] leading-relaxed text-center text-white/90 font-mono">{book.hoverText}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-white/70">
                  <FiBookOpen className="w-3.5 h-3.5 text-white/50" />
                  <h3 className="text-[11px] tracking-wide font-mono uppercase">{book.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
