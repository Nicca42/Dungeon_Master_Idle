import { RestRoomPanel } from './RestRoomPanel';
import { nextExcavationFloor } from '../game/engine';
import { ArtGallery } from './ArtGallery';
import { actorActivity } from '../game/actorActivity';
import { ResearchPanel as Research, AdventurerOffice } from './ResearchPanel';
import { StaffRoom } from './StaffRoom';
import { Stats as StatsPage } from './Stats';
import { rule } from '../game/config';
import { primaryAvailable } from '../game/recovery';
import { restRoster, restWaiters } from '../game/rest';
import React, { ReactNode, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  AccessibilityInfo,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDown,
  ArrowRight,
  BedDouble,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coins,
  DoorOpen,
  FastForward,
  FlaskConical,
  Hammer,
  Heart,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  Pickaxe,
  Plus,
  RotateCcw,
  Settings2,
  Shield,
  Sparkles,
  Swords,
  TrendingUp,
  Users,
  VolumeX,
  X,
  Zap,
} from 'lucide-react-native';
import { colors as c, fonts } from '../theme';
import {
  useGame,
  clearToast,
  dismissReport,
  dispatch,
  resetDemo,
  skipTime,
  initialize,
} from '../game/store';
import { Actor, Floor, GameState, Stat } from '../game/types';
import { DAY, gameDate, HOUR, money, RESEARCH, TUTORIAL } from '../game/content';
import {
  level,
  excavationMinutes,
  diggersInactive,
  canExcavate,
  adventurerCap,
} from '../game/engine';
import {
  Body,
  Button,
  Coin,
  Divider,
  Heading,
  Label,
  Panel,
  Pill,
  Progress,
  Row,
  TextLink,
} from './ui';
import { Sprite, outfitColor } from './PixelArt';
import { DungeonScene } from './DungeonScene';
import { FloorLayoutEditor } from './FloorLayoutEditor';
import { useLiveClock, countdown } from './LiveClock';
import { PixelGear } from './PixelGear';
import { FloorSettings } from './FloorSettings';

type Tab = 'dungeon' | 'build' | 'research' | 'office' | 'stats' | 'art';
const tabs = [
  {
    id: 'dungeon' as Tab,
    title: 'Dungeon',
    icon: LayoutDashboard,
    sub: 'Your subterranean empire',
  },
  { id: 'build' as Tab, title: 'Build', icon: Pickaxe, sub: 'Room for a little more trouble' },
  {
    id: 'research' as Tab,
    title: 'Research',
    icon: FlaskConical,
    sub: 'Bad ideas. Better execution.',
  },
  { id: 'office' as Tab, title: 'Office', icon: BookOpen, sub: 'The business of misadventure' },
  { id: 'stats' as Tab, title: 'Stats', icon: TrendingUp, sub: 'The numbers beneath the dungeon' },
  { id: 'art' as Tab, title: 'Demo settings', icon: Sparkles, sub: 'Time controls and pixel art' },
];
const titles: Record<Tab, string> = {
  dungeon: 'The depths await.',
  build: 'Great things start below.',
  research: 'A dangerous education.',
  office: 'A well-managed menace.',
  stats: 'Gold, growth, and fine tuning.',
  art: 'Demo settings.',
};
const statusColor = (stage: string) =>
  stage === 'open' ? c.green : stage === 'locked' ? c.dim : c.gold;

export default function AppScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions(),
    wide = width >= 1050,
    desktop = width >= 800;
  const pathname = usePathname();
  const tab = (pathname.slice(1) || 'dungeon') as Tab;
  const actualTab = tabs.some((t) => t.id === tab) ? tab : 'dungeon';
  const router = useRouter();
  const {
    game: g,
    wall,
    foreground,
    ready,
    busy,
    error,
    toast,
    report,
    progress,
    welcomeUntil,
  } = useGame();
  const [restFloor, setRestFloor] = useState<number | null>(null);
  const liveNow = useLiveClock(g, wall);
  const bonusElapsed = foreground && !g.gameOver ? Math.max(0, liveNow - g.now) : 0;
  const displayGame = {
    ...g,
    now: liveNow,
    nextArrivalAt: g.nextArrivalAt - bonusElapsed,
    researchJob: g.researchJob ? { ...g.researchJob, end: g.researchJob.end - bonusElapsed } : null,
  };
  const openDiggers = () => {
    setStaffPage('diggers');
    setAdminPage(1);
    setModal('admin');
  };
  const [modal, setModal] = useState<
    'help' | 'reset' | 'fixture' | 'activity' | 'floors' | 'hire' | 'admin' | 'excavation' | null
  >(null);
  const [selectedActor, setActor] = useState<Actor | null>(null),
    [selectedFloor, setFloor] = useState<Floor | null>(null);
  const pageScroll = useRef<ScrollView>(null);
  const [adminPage, setAdminPage] = useState(0);
  const [staffPage, setStaffPage] = useState<'diggers' | 'maintainers' | 'adventurers'>('diggers');
  const previousTutorial = useRef(g.tutorial);
  useEffect(() => {
    const before = previousTutorial.current;
    previousTutorial.current = g.tutorial;
    if (
      (before === 2 && g.tutorial === 3) ||
      (before === 5 && g.tutorial === 6) ||
      (before === 7 && g.tutorial === 8)
    )
      setModal(null);
  }, [g.tutorial]);
  const [layoutFloor, setLayoutFloor] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const openTutorial = () => {
    setStaffPage(g.tutorial === 7 ? 'maintainers' : 'diggers');
    setAdminPage(g.tutorial === 6 ? 3 : [1, 2, 7].includes(g.tutorial) ? 1 : 0);
    setModal(g.tutorial === 3 ? 'excavation' : [4, 5].includes(g.tutorial) ? 'floors' : 'admin');
  };
  const finishTutorial = async () => {
    await dispatch({ type: 'tutorial' });
    if (g.tutorial !== 4) setModal(null);
  };
  const editLayout = () => {
    setModal(null);
    setLayoutFloor(1);
    pageScroll.current?.scrollTo({ y: 0, animated: true });
  };
  const [welcome, setWelcome] = useState(true);
  useEffect(() => {
    const remaining = Math.max(0, welcomeUntil - Date.now());
    setWelcome(remaining > 0);
    const timer = setTimeout(() => setWelcome(false), remaining);
    return () => clearTimeout(timer);
  }, [welcomeUntil]);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clearToast, 4500);
    return () => clearTimeout(id);
  }, [toast]);
  function navigate(id: Tab) {
    router.push(id === 'dungeon' ? '/' : `/${id}`);
  }
  if (!ready || error)
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Sprite kind="miner" size={80} />
        <Heading size={36}>{error ? 'A small cave-in.' : 'Opening the gates…'}</Heading>
        <Body style={{ maxWidth: 450, textAlign: 'center', marginTop: 14 }}>
          {error ??
            (busy
              ? `Your dungeon kept busy. Catching up… ${Math.round(progress * 100)}%`
              : 'Dusting off the ledger. Lighting the torches.')}
        </Body>
        {error ? (
          <Button style={{ marginTop: 20 }} onPress={() => void initialize(true)}>
            Retry loading saved dungeon
          </Button>
        ) : (
          <ActivityIndicator color={c.gold} style={{ marginTop: 20 }} />
        )}
      </View>
    );
  return (
    <View style={s.root}>
      {desktop && (
        <View style={s.sidebar}>
          <Brand />
          <View style={{ marginTop: 43, gap: 7 }}>
            <Label style={{ marginLeft: 14, marginBottom: 12 }}>Your domain</Label>
            {tabs.map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={t.title}
                onPress={() => navigate(t.id)}
                style={[s.nav, actualTab === t.id && s.navSelected]}
              >
                <t.icon size={18} color={actualTab === t.id ? c.gold : c.muted} strokeWidth={1.7} />
                <Text style={[s.navText, actualTab === t.id && { color: c.gold }]}>{t.title}</Text>
                {actualTab === t.id && <View style={s.navDot} />}
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: 32, paddingHorizontal: 14 }}>
            <Label>Dungeon status</Label>
            <View style={{ height: 17 }} />
            <Row>
              <View style={[s.dot, { backgroundColor: g.opened ? c.green : c.gold }]} />
              <Body color={c.text}>{g.opened ? 'Open for adventure' : 'Under construction'}</Body>
            </Row>
            <Row style={{ marginTop: 12 }}>
              <Layers3 size={14} color={c.dim} />
              <Body>
                {g.floors.filter((f) => f.stage === 'open').length} of {g.floors.length} floors open
              </Body>
            </Row>
          </View>
          <View style={{ flex: 1 }} />
          <View style={s.sidebarQuote}>
            <Sprite kind="slime" size={37} />
            <Text style={{ fontFamily: fonts.pixel, color: c.purple, fontSize: 16, marginTop: 7 }}>
              “Home is where{'\n'}the hoard is.”
            </Text>
            <Body style={{ fontSize: 10, marginTop: 5 }}>— a financially literate slime</Body>
          </View>
          <Pressable
            onPress={() => setModal('help')}
            accessibilityRole="button"
            accessibilityLabel="How to play"
            style={[s.nav, { marginTop: 16 }]}
          >
            <CircleHelp size={17} color={c.muted} />
            <Body>Dungeon handbook</Body>
          </Pressable>
          <Row style={{ padding: 13, paddingTop: 8 }}>
            <View style={[s.dot, { backgroundColor: c.green, width: 5, height: 5 }]} />
            <Text style={{ color: c.dim, fontFamily: fonts.body, fontSize: 10 }}>
              LOCAL DEMO · AUTO-SAVED
            </Text>
          </Row>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[s.topbar, { paddingHorizontal: desktop ? 32 : 18 }]}>
          {desktop ? (
            <Row>
              <Label>Underkeep</Label>
              <ChevronRight size={12} color={c.dim} />
              <Label color={c.text}>{actualTab === 'dungeon' ? 'Overview' : actualTab}</Label>
            </Row>
          ) : (
            <Text style={{ fontFamily: fonts.pixelBold, color: c.gold, fontSize: 22 }}>
              UNDERKEEP
            </Text>
          )}
          <Row style={{ gap: desktop ? 20 : 10 }}>
            <Row style={s.clock}>
              <Clock3 size={13} color={c.gold} />
              <Text style={{ fontFamily: fonts.medium, color: c.text, fontSize: 11 }}>
                {gameDate(g.now)}
              </Text>
            </Row>
          </Row>
        </View>
        <ScrollView
          ref={pageScroll}
          scrollEnabled={!dragging}
          contentContainerStyle={{
            padding: desktop ? 32 : 8,
            paddingTop: desktop ? 18 : 6,
            paddingBottom: desktop ? 32 : 95,
          }}
        >
          <View style={{ maxWidth: 1400, alignSelf: 'center', width: '100%' }}>
            {(actualTab !== 'dungeon' || welcome) && (
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Label color={c.gold} style={{ marginBottom: 8 }}>
                    A little ambition. A lot of digging.
                  </Label>
                  <Heading size={desktop ? 39 : 32}>{titles[actualTab]}</Heading>
                  <Body style={{ marginTop: 6 }}>
                    {g.tutorial < 10
                      ? 'Welcome, Dungeon Master. Let’s build something worth raiding.'
                      : tabs.find((t) => t.id === actualTab)!.sub}
                  </Body>
                </View>
              </Row>
            )}
            {g.gameOver && (
              <Panel>
                <Heading>Headquarters has fallen</Heading>
                <Body>Escaped mobs destroyed your office. Restart to build a new dungeon.</Body>
                <Body>Open Demo settings to restart.</Body>
              </Panel>
            )}
            {actualTab !== 'art' && (
              <Stats g={g} small={!desktop} compact={actualTab === 'dungeon'} />
            )}
            {g.researchJob && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open active research"
                onPress={() => {
                  setAdminPage(2);
                  setModal('admin');
                }}
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderColor: c.purple,
                  borderRadius: 7,
                  marginBottom: 12,
                  backgroundColor: c.panel,
                }}
              >
                <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                  <Body color={c.text}>
                    {RESEARCH.find((r) => r.id === g.researchJob!.id)?.name}
                  </Body>
                  <Body color={c.purple} style={{ fontSize: 11 }}>
                    {countdown(g.researchJob.end - liveNow - bonusElapsed)}
                  </Body>
                </Row>
                <View style={{ marginTop: 8 }}>
                  <Progress
                    color={c.purple}
                    value={
                      1 -
                      (g.researchJob.end - liveNow - bonusElapsed) /
                        ((RESEARCH.find((r) => r.id === g.researchJob!.id)?.hours ?? 1) * HOUR)
                    }
                    height={5}
                  />
                </View>
              </Pressable>
            )}
            {!wide && g.tutorial < 10 && (
              <View style={{ marginBottom: 20 }}>
                <Tutorial g={g} busy={busy} compact onOpen={openTutorial} />
              </View>
            )}
            <View
              style={{ flexDirection: wide ? 'row' : 'column', gap: 22, alignItems: 'flex-start' }}
            >
              <View
                style={{
                  flex: wide ? 1 : undefined,
                  width: wide ? undefined : '100%',
                  minWidth: 0,
                  gap: 12,
                }}
              >
                {actualTab === 'dungeon' && (
                  <>
                    {layoutFloor !== null && (
                      <FloorLayoutEditor
                        g={g}
                        floor={layoutFloor}
                        onClose={() => setLayoutFloor(null)}
                        onDragging={setDragging}
                      />
                    )}
                    <DungeonScene
                      g={displayGame}
                      onFloor={setFloor}
                      onActor={setActor}
                      onRest={setRestFloor}
                      reduced={reduced}
                      onSettings={() => setModal('floors')}
                      onComplaints={() => navigate('office')}
                      onHire={() => setModal('hire')}
                      onAdmin={() => setModal('admin')}
                      onDiggers={openDiggers}
                      onDefenders={() => {
                        setStaffPage('adventurers');
                        setAdminPage(1);
                        setModal('admin');
                      }}
                    />
                    <PartyPanel g={g} onActor={setActor} />
                  </>
                )}
                {actualTab === 'art' && (
                  <>
                    <Body>
                      These controls are just for the demo. Time skips use the same simulation as
                      being away.
                    </Body>
                    <Divider />
                    <Label color={c.gold}>Advance real-world time</Label>
                    <View style={{ gap: 10, marginTop: 13 }}>
                      {[
                        { title: '5 minutes', hours: 1 / 12, sub: '2 dungeon hours' },
                        { title: '1 hour', hours: 1, sub: '1 dungeon day' },
                        { title: '8 hours', hours: 8, sub: '8 dungeon days' },
                      ].map((t) => (
                        <Button
                          key={t.title}
                          secondary
                          disabled={!g.opened || busy}
                          icon={FastForward}
                          onPress={() => {
                            setModal(null);
                            void skipTime(t.hours);
                          }}
                        >
                          {t.title} → {t.sub}
                        </Button>
                      ))}
                    </View>
                    {!g.opened && (
                      <Body style={{ marginTop: 10, fontSize: 11 }}>
                        Open the first floor to enable idle time. Or load the prepared demo below.
                      </Body>
                    )}
                    <Body>
                      {g.excavationSpells} free excavation spells left. Each finishes digging only;
                      foundations and furnishings still need builders. Floors are worked in order.
                    </Body>
                    {g.floors
                      .filter((f) => ['queued', 'excavating'].includes(f.stage))
                      .map((f) => (
                        <Button
                          key={f.id}
                          secondary
                          disabled={busy || g.excavationSpells === 0 || !canExcavate(g, f)}
                          onPress={() => void dispatch({ type: 'excavationSpell', floor: f.id })}
                        >
                          Finish excavating floor {f.id} · free spell
                          {!canExcavate(g, f) ? ' · furnish above first' : ''}
                        </Button>
                      ))}
                    {g.gold === 0 && !g.recoveryGrant && g.now - g.quietSince >= DAY && (
                      <Button secondary onPress={() => void dispatch({ type: 'grant' })}>
                        Claim 25-gold demo recovery grant
                      </Button>
                    )}{' '}
                    <Divider />
                    <Button secondary icon={DoorOpen} onPress={() => setModal('fixture')}>
                      Load a ready-to-play dungeon
                    </Button>
                    <View style={{ height: 10 }} />
                    <Button secondary icon={RotateCcw} onPress={() => setModal('reset')}>
                      Restart the tutorial
                    </Button>
                    <Body style={{ marginTop: 16, fontSize: 10 }}>
                      Build v0.1 · Seed {g.seed} · {g.actors.length} NPCs · {g.parties.length}{' '}
                      active parties
                    </Body>
                  </>
                )}
                {actualTab === 'art' && <ArtGallery g={g} />}
                {actualTab === 'stats' && <StatsPage g={g} busy={busy} />}
                {actualTab === 'build' && <Build g={g} busy={busy} />}
                {actualTab === 'research' && <Research g={g} busy={busy} />}
                {actualTab === 'office' && <Office g={g} busy={busy} onActor={setActor} />}
              </View>
              <View
                style={{
                  flex: wide ? 1 : undefined,
                  minWidth: 0,
                  width: wide ? undefined : '100%',
                  display: ['art', 'stats'].includes(actualTab) ? 'none' : 'flex',
                  gap: 12,
                }}
              >
                {g.tutorial < 10 ? (
                  wide ? (
                    <Tutorial g={g} busy={busy} onOpen={openTutorial} />
                  ) : null
                ) : (
                  <Pulse g={g} />
                )}
              </View>
              <View
                style={{
                  flex: wide ? 1 : undefined,
                  minWidth: 0,
                  width: wide ? undefined : '100%',
                  display: ['art', 'stats'].includes(actualTab) ? 'none' : 'flex',
                  gap: 12,
                }}
              >
                <Panel>
                  <Row style={{ justifyContent: 'space-between', marginBottom: 17 }}>
                    <Label color={c.text}>Dungeon activity</Label>
                    <View style={[s.dot, { backgroundColor: c.green }]} />
                  </Row>
                  {g.activity.slice(0, 4).map((a, index) => (
                    <Row
                      key={a.id}
                      style={{
                        alignItems: 'flex-start',
                        marginBottom: index === 3 ? 0 : 16,
                        gap: 11,
                      }}
                    >
                      <View style={{ marginTop: 4 }}>
                        {a.kind === 'gold' ? (
                          <Coins size={14} color={c.gold} />
                        ) : a.kind === 'work' ? (
                          <Hammer size={14} color={c.purple} />
                        ) : a.kind === 'combat' ? (
                          <Swords size={14} color={c.red} />
                        ) : (
                          <Sparkles size={14} color={c.green} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Body
                          color={index === 0 ? c.text : c.muted}
                          style={{ fontSize: 12, lineHeight: 19 }}
                        >
                          {a.text}
                        </Body>
                        <Text
                          style={{
                            fontFamily: fonts.body,
                            color: c.dim,
                            fontSize: 10,
                            marginTop: 3,
                          }}
                        >
                          {gameDate(a.time)}
                        </Text>
                      </View>
                    </Row>
                  ))}
                  <View style={{ marginTop: 12 }}>
                    <TextLink onPress={() => setModal('activity')}>View the ledger</TextLink>
                  </View>
                </Panel>
                <Row style={{ paddingHorizontal: 4, alignItems: 'flex-start' }}>
                  <Clock3 size={15} color={c.dim} style={{ marginTop: 2 }} />
                  <Body style={{ fontSize: 11, lineHeight: 18 }}>
                    1 real hour = 1 dungeon day.{'\n'}
                    {g.opened
                      ? 'Your dungeon keeps going while you’re away.'
                      : 'Idle time begins when you open the dungeon.'}
                  </Body>
                </Row>
              </View>
            </View>
            <Row style={{ marginTop: 26, justifyContent: 'space-between' }}>
              <Body style={{ fontSize: 10, color: c.dim }}>
                UNDERKEEP · A DUNGEON MANAGEMENT DEMO
              </Body>
              <Row style={{ gap: 5 }}>
                <Shield size={11} color={c.dim} />
                <Body style={{ fontSize: 10, color: c.dim }}>Saved on this device</Body>
              </Row>
            </Row>
          </View>
        </ScrollView>
        {!desktop && (
          <View style={[s.bottomNav, { paddingBottom: Math.max(5, insets.bottom) }]}>
            {tabs.map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={t.title}
                onPress={() => navigate(t.id)}
                style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12 }}
              >
                <t.icon size={19} color={actualTab === t.id ? c.gold : c.dim} />
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    color: actualTab === t.id ? c.gold : c.muted,
                    fontSize: 10,
                  }}
                >
                  {t.title}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {toast && (
        <Pressable onPress={clearToast} style={[s.toast, { bottom: desktop ? 24 : 82 }]}>
          <Check size={16} color={c.gold} />
          <Body color={c.text} style={{ flex: 1, fontSize: 12 }}>
            {toast}
          </Body>
          <X size={14} color={c.dim} />
        </Pressable>
      )}
      {busy && progress > 0 && (
        <View style={s.processing}>
          <ActivityIndicator color={c.gold} />
          <Body color={c.text}>The dungeon is catching up… {Math.round(progress * 100)}%</Body>
        </View>
      )}
      <Dialog
        visible={restFloor !== null}
        title={`Rest room · Floor ${restFloor ?? 1}`}
        onClose={() => setRestFloor(null)}
      >
        {restFloor !== null && (
          <RestRoomPanel
            key={restFloor}
            title={`Rest room · Floor ${restFloor}`}
            capacity={g.policy.restCapacity}
            roster={restRoster(g, restFloor)}
            waiting={restWaiters(g, restFloor)}
            now={liveNow}
            onActor={setActor}
          />
        )}
      </Dialog>
      <Dialog
        scrollTarget={modal === 'floors' && g.tutorial === 5 ? 160 : undefined}
        visible={!!modal}
        onClose={() => setModal(null)}
        title={
          modal === 'admin'
            ? 'Headquarters settings'
            : modal === 'excavation'
              ? 'Excavation settings'
              : modal === 'hire'
                ? 'Your crew needs backup'
                : modal === 'floors'
                  ? 'Floor group settings'
                  : modal === 'help'
                    ? 'The dungeon handbook.'
                    : modal === 'activity'
                      ? 'A record of misadventures.'
                      : 'Start a new chapter?'
        }
      >
        {modal === 'hire' && (
          <View>
            <Body>
              All maintainers are occupied or resting, and another trap needs resetting. Hire an
              additional maintainer for 15 gold.
            </Body>
            <Button
              pulse={g.tutorial === 7}
              style={g.tutorial === 7 ? { borderWidth: 2, borderColor: c.gold } : undefined}
              disabled={
                busy ||
                g.gold < rule(g, 'cost.maintenance') * 100 ||
                (!g.research.includes('staff') && g.tutorial !== 7)
              }
              onPress={() => {
                void dispatch({ type: 'hireMaintenance' });
                setModal(null);
              }}
            >
              {`Hire maintainer · ${rule(g, 'cost.maintenance')} gold`}
            </Button>
          </View>
        )}
        {modal === 'floors' && (
          <>
            <FloorSettings
              g={g}
              busy={busy}
              guided={g.tutorial === 4 || g.tutorial === 5}
              onComplete={() => void finishTutorial()}
              onEdit={editLayout}
            />
          </>
        )}
        {(modal === 'admin' || modal === 'excavation') && (
          <>
            {g.tutorial < 10 &&
              ((modal === 'admin' && ![3, 4, 5, 6].includes(g.tutorial)) ||
                (modal === 'excavation' && [2, 3].includes(g.tutorial))) && (
                <Panel>
                  <Heading size={23}>{TUTORIAL[g.tutorial]!.title}</Heading>
                  <Body style={{ marginVertical: 12 }}>{TUTORIAL[g.tutorial]!.text}</Body>
                  {[1, 2, 7].includes(g.tutorial) ? (
                    <Body color={c.gold}>
                      Use the highlighted buttons below. Each click hires one worker or queues one
                      floor.
                    </Body>
                  ) : (
                    <Button pulse disabled={busy} onPress={() => void finishTutorial()}>
                      {TUTORIAL[g.tutorial]!.action}
                    </Button>
                  )}
                </Panel>
              )}
            {modal === 'admin' ? (
              <>
                <Row style={{ marginVertical: 14, flexWrap: 'wrap' }}>
                  {['Overview', 'Staff', 'Research', 'Finances', 'Adventurers'].map((name, i) => (
                    <Button
                      key={name}
                      compact
                      secondary={adminPage !== i}
                      onPress={() => setAdminPage(i)}
                    >
                      {name}
                    </Button>
                  ))}
                </Row>
                {adminPage === 0 && (
                  <>
                    <Body style={{ marginBottom: 12 }}>
                      Headquarters health: {g.officeHealth} / 100
                    </Body>
                    {g.tutorial >= 7 && <Office g={g} busy={busy} onActor={setActor} />}
                  </>
                )}
                {adminPage === 1 && (
                  <View style={{ gap: 14 }}>
                    <Heading>Staff management</Heading>
                    <StaffRoom g={g} busy={busy} now={liveNow} onActor={setActor} />
                    <Stepper
                      label="Staff rest threshold (%)"
                      value={g.staffRestThreshold ?? 0}
                      min={0}
                      max={90}
                      disabled={busy || !g.research.includes('staminaManagement')}
                      onChange={(value) => void dispatch({ type: 'staffRestThreshold', value })}
                    />
                    {!g.research.includes('staminaManagement') && (
                      <Body>
                        Unlock Better stamina management to choose when staff pause their work for
                        an office break.
                      </Body>
                    )}
                    <Row style={{ flexWrap: 'wrap' }}>
                      <Button
                        compact
                        secondary={staffPage !== 'diggers'}
                        onPress={() => setStaffPage('diggers')}
                      >
                        Diggers
                      </Button>
                      <Button
                        compact
                        secondary={staffPage !== 'maintainers'}
                        onPress={() => setStaffPage('maintainers')}
                      >
                        Maintainers
                      </Button>
                      <Button
                        compact
                        secondary={staffPage !== 'adventurers'}
                        onPress={() => setStaffPage('adventurers')}
                      >
                        Adventurers
                      </Button>
                    </Row>
                    {staffPage === 'adventurers' ? (
                      <View style={{ gap: 12 }}>
                        <Heading>Headquarters defenders</Heading>
                        <Body>
                          Blue-jacket adventurers guard the cave. Wages: 1 gold per dungeon hour on
                          duty, billed in five-minute portions. Defenders recover in the staff-only
                          office room at one point per game hour. They wait when beds are full and
                          receive no wages while resting. Without wage funds they stand down.
                        </Body>
                        <Button
                          disabled={
                            busy ||
                            g.gold < Math.max(100, rule(g, 'cost.defender') * 100) ||
                            !g.research.includes('staff')
                          }
                          onPress={() => void dispatch({ type: 'hireDefender' })}
                        >
                          {`Hire adventurer · ${rule(g, 'wage')} gold/hour${rule(g, 'cost.defender') ? ` · ${rule(g, 'cost.defender')} gold hire fee` : ''}`}
                        </Button>
                        {g.actors
                          .filter((a) => a.role === 'defender')
                          .map((a) => (
                            <Pressable
                              key={a.id}
                              onPress={() => setActor(a)}
                              accessibilityRole="button"
                              accessibilityLabel={`Defender ${a.name}`}
                            >
                              <Row>
                                <Sprite kind="defender" size={35} />
                                <View>
                                  <Body>
                                    {a.name} · {a.status}
                                  </Body>
                                  <Body>
                                    Stamina {a.stamina}/{a.maxStamina} ·{' '}
                                    {a.status === 'working' ? '1 gold/hour' : 'Unpaid'}
                                    {a.status === 'resting'
                                      ? g.floors.some((f) =>
                                          f.restOccupants.some((o) => o.actorId === a.id),
                                        )
                                        ? ` · ${countdown(a.until - liveNow)} rest`
                                        : ' · Waiting for rest bed'
                                      : ''}
                                  </Body>
                                </View>
                              </Row>
                            </Pressable>
                          ))}
                      </View>
                    ) : (
                      <>
                        {[1, 2, 7].includes(g.tutorial) && (
                          <Body color={c.gold}>
                            {g.tutorial === 1
                              ? `${g.actors.filter((a) => a.role === 'miner').length} / 3 diggers hired`
                              : g.tutorial === 2
                                ? `${g.floors.slice(0, 3).filter((f) => f.stage !== 'locked').length} / 3 excavations queued`
                                : `${g.actors.filter((a) => a.role === 'maintenance').length} / 3 maintainers hired`}
                          </Body>
                        )}
                        <Row style={{ flexWrap: 'wrap' }}>
                          {staffPage === 'maintainers' && (
                            <Button
                              pulse={g.tutorial === 7}
                              style={
                                g.tutorial === 7
                                  ? { borderWidth: 2, borderColor: c.gold }
                                  : undefined
                              }
                              disabled={
                                busy ||
                                g.gold < rule(g, 'cost.maintenance') * 100 ||
                                (!g.research.includes('staff') && g.tutorial !== 7)
                              }
                              onPress={() => void dispatch({ type: 'hireMaintenance' })}
                            >
                              {`Hire maintainer · ${rule(g, 'cost.maintenance')} gold`}
                            </Button>
                          )}
                          {staffPage === 'diggers' && (
                            <Button
                              pulse={g.tutorial === 1}
                              style={
                                g.tutorial === 1
                                  ? { borderWidth: 2, borderColor: c.gold }
                                  : undefined
                              }
                              disabled={
                                busy || g.gold < rule(g, 'cost.miner') * 100 || g.tutorial < 1
                              }
                              onPress={() => void dispatch({ type: 'hireMiner' })}
                            >
                              {`Hire digger · ${rule(g, 'cost.miner')} gold`}
                            </Button>
                          )}
                        </Row>
                        {staffPage === 'diggers' && (
                          <>
                            <Label color={c.gold}>Digger assignments</Label>
                            <Button
                              pulse={g.tutorial === 2}
                              style={
                                g.tutorial === 2 || diggersInactive(g)
                                  ? { borderWidth: 2, borderColor: c.gold }
                                  : undefined
                              }
                              disabled={
                                busy ||
                                g.gold < rule(g, 'cost.excavate') * 100 ||
                                g.tutorial < 2 ||
                                !nextExcavationFloor(g)
                              }
                              onPress={() => void dispatch({ type: 'excavateNext' })}
                            >
                              {`Excavate next floor\n-${rule(g, 'cost.excavate')} gold`}
                            </Button>
                          </>
                        )}
                        {g.actors
                          .filter(
                            (a) => a.role === (staffPage === 'diggers' ? 'miner' : 'maintenance'),
                          )
                          .map((a) => (
                            <Pressable
                              key={a.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Staff details ${a.name} ${a.id}`}
                              onPress={() => setActor(a)}
                              style={{
                                padding: 12,
                                borderWidth: 1,
                                borderColor: c.border,
                                borderRadius: 6,
                              }}
                            >
                              <Body color={c.text}>
                                {a.name} · {a.role === 'miner' ? 'Digger' : 'Maintainer'} ·{' '}
                                {a.status}
                              </Body>
                              <Body style={{ fontSize: 11 }}>
                                Stamina {a.stamina}/{a.maxStamina} ·{' '}
                                {a.task
                                  ? `${a.task.kind} on floor ${a.task.floor}`
                                  : a.role === 'miner'
                                    ? 'Excavation and construction'
                                    : 'Waiting at headquarters'}
                              </Body>
                            </Pressable>
                          ))}
                      </>
                    )}
                  </View>
                )}
                {adminPage === 3 && (
                  <Finance
                    g={g}
                    busy={busy}
                    guided={g.tutorial === 6}
                    onComplete={() => void finishTutorial()}
                  />
                )}
                {adminPage === 4 && <AdventurerOffice g={g} busy={busy} />}
                {adminPage === 2 && <Research g={displayGame} busy={busy} />}
                <Row style={{ justifyContent: 'space-between', marginTop: 18 }}>
                  <Button
                    compact
                    secondary
                    disabled={adminPage === 0}
                    onPress={() => setAdminPage(adminPage - 1)}
                  >
                    Previous
                  </Button>
                  <Body>{adminPage + 1} / 5</Body>
                  <Button
                    compact
                    secondary
                    disabled={adminPage === 4}
                    onPress={() => setAdminPage(adminPage + 1)}
                  >
                    Next page
                  </Button>
                </Row>
              </>
            ) : (
              <Build g={g} busy={busy} />
            )}
          </>
        )}
        {(modal === 'reset' || modal === 'fixture') && (
          <>
            <Body>
              This replaces the dungeon saved on this device.{' '}
              {modal === 'fixture'
                ? 'The new demo starts with a furnished first floor, staff, and an adventuring party.'
                : 'You’ll start again with 200 gold and an empty patch of land.'}
            </Body>
            <Row style={{ marginTop: 24 }}>
              <Button secondary onPress={() => setModal(null)}>
                Keep my dungeon
              </Button>
              <Button
                icon={RotateCcw}
                onPress={() => {
                  const prepared = modal === 'fixture';
                  setModal(null);
                  void resetDemo(prepared);
                }}
              >
                Start fresh
              </Button>
            </Row>
          </>
        )}
        {modal === 'help' && (
          <>
            <Heading size={22}>Build. Lure. Maintain. Repeat.</Heading>
            <Body style={{ marginTop: 12 }}>
              You run the dungeon. Adventurers do the adventuring. Follow the setup guide, then use
              admission income to fund more floors and research.
            </Body>
            <Divider />
            {[
              [
                'Your crew',
                'Miners excavate and build. Maintenance workers reset traps and stock treasure. Exhausted workers rest automatically.',
              ],
              [
                'Your visitors',
                'Parties contain at least two fighters, a wizard, and a healer. They pay once, explore open floors, and take home whatever they find.',
              ],
              [
                'Your gold',
                'Treasury funds development. The treasure reserve funds chest refills. Adjust the split in Office.',
              ],
              [
                'Your time',
                'An hour away is a full dungeon day. Progress is calculated when you return, with no background app required.',
              ],
              [
                'Demo scope',
                'Five floors, local saves, simplified combat and fixed layouts. Upgrade foundations are cosmetic protection; equipment is converted into gold.',
              ],
            ].map(([title, text]) => (
              <View key={title} style={{ marginBottom: 17 }}>
                <Label color={c.gold}>{title}</Label>
                <Body style={{ marginTop: 5 }}>{text}</Body>
              </View>
            ))}
          </>
        )}
        {modal === 'activity' && (
          <>
            {g.activity.map((a) => (
              <View
                key={a.id}
                style={{ borderBottomWidth: 1, borderColor: c.border, paddingVertical: 12 }}
              >
                <Label>{gameDate(a.time)}</Label>
                <Body color={c.text} style={{ marginTop: 5 }}>
                  {a.text}
                </Body>
              </View>
            ))}
          </>
        )}
      </Dialog>
      <Dialog
        visible={!!selectedActor}
        onClose={() => setActor(null)}
        title={selectedActor ? `${selectedActor.name}, the ${selectedActor.role}` : ''}
      >
        {selectedActor && (
          <ActorDetails
            g={g}
            reduced={reduced}
            actor={g.actors.find((a) => a.id === selectedActor.id) ?? selectedActor}
          />
        )}
      </Dialog>
      <Dialog
        visible={!!selectedFloor}
        onClose={() => setFloor(null)}
        title={selectedFloor?.name ?? ''}
      >
        {selectedFloor && (
          <FloorDetails floor={g.floors[selectedFloor.id - 1]!} g={g} busy={busy} />
        )}
      </Dialog>
      <Dialog
        visible={!!report}
        onClose={dismissReport}
        title={
          report?.simulated ? 'A day in the life of a dungeon.' : 'Welcome back, Dungeon Master.'
        }
      >
        {report && (
          <>
            <Pill>{report.simulated ? 'DEMO TIME SKIP' : 'WHILE YOU WERE AWAY'}</Pill>
            <Body style={{ marginTop: 14 }}>
              {report.realHours < 1
                ? `${Math.round(report.realHours * 60)} real minutes`
                : `${report.realHours.toFixed(1)} real hours`}{' '}
              passed. That’s {(report.realHours * 24).toFixed(1)} dungeon hours of questionable
              enterprise.
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
              {[
                { label: 'Gold earned', value: `${money(report.totals.income)} g` },
                { label: 'Visitors admitted', value: report.totals.admissions },
                { label: 'Treasure claimed', value: `${money(report.totals.loot)} g` },
                { label: 'Floors completed', value: report.totals.built },
              ].map((item) => (
                <View
                  key={item.label}
                  style={{ width: '47%', backgroundColor: c.bg, padding: 16, borderRadius: 6 }}
                >
                  <Heading size={31} style={{ color: c.gold }}>
                    {item.value}
                  </Heading>
                  <Body style={{ fontSize: 11 }}>{item.label}</Body>
                </View>
              ))}
            </View>
            <Divider />
            <Body>
              {report.totals.visits} expeditions finished · {report.totals.retreats} retreats ·{' '}
              {report.totals.training} training enrollments.
            </Body>
            <Body style={{ fontSize: 11, marginTop: 9 }}>
              Progress is already saved. This report doesn’t add a second reward.
            </Body>
            <Button
              onPress={() => {
                dismissReport();
                router.push('/');
              }}
              style={{ marginTop: 20 }}
              icon={ArrowRight}
            >
              Back to the dungeon
            </Button>
          </>
        )}
      </Dialog>
    </View>
  );
}

function Brand() {
  return (
    <View style={{ paddingHorizontal: 7 }}>
      <Row style={{ gap: 10 }}>
        <View
          style={{
            width: 28,
            height: 30,
            borderWidth: 2,
            borderColor: c.gold,
            backgroundColor: c.goldDark,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowDown size={19} color={c.gold} strokeWidth={2.5} />
        </View>
        <Text
          style={{ fontFamily: fonts.pixelBold, fontSize: 24, color: c.gold, letterSpacing: 0.6 }}
        >
          UNDERKEEP
        </Text>
      </Row>
      <Text
        style={{
          fontFamily: fonts.medium,
          fontSize: 8,
          color: c.dim,
          letterSpacing: 2.2,
          marginTop: 9,
          marginLeft: 39,
        }}
      >
        FORTUNE FAVORS THE DEPTHS
      </Text>
    </View>
  );
}
function Stats({ g, small, compact = false }: { g: GameState; small: boolean; compact?: boolean }) {
  const data = [
    {
      label: 'Treasury',
      value: money(g.gold),
      unit: 'gold',
      icon: Coins,
      color: c.gold,
      detail: 'A modest start. A grand ambition.',
    },
    {
      label: 'Adventurers',
      value: String(g.parties.reduce((n, p) => n + p.members.length, 0)),
      unit: 'inside',
      icon: Swords,
      color: c.purple,
      detail: `${g.actors.filter((a) => a.status === 'town').length} waiting in town`,
    },
    {
      label: 'Your crew',
      value: String(
        g.actors.filter((a) => ['miner', 'maintenance', 'defender'].includes(a.role)).length,
      ),
      unit: 'staff',
      icon: Users,
      color: c.green,
      detail: `${g.actors.filter((a) => a.role === 'miner').length} miners · ${g.actors.filter((a) => a.role === 'maintenance').length} maintenance`,
    },
    {
      label: 'Dungeon depth',
      value: `${g.floors.filter((f) => ['ready', 'open'].includes(f.stage)).length}`,
      unit: `/ ${g.floors.length} floors`,
      icon: Layers3,
      color: '#bd9b83',
      detail: g.opened ? 'There’s always more beneath.' : 'Your story starts at the surface.',
    },
  ];
  if (compact)
    return (
      <View
        style={{
          marginVertical: 8,
          padding: 10,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 7,
          backgroundColor: c.panel,
        }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 6 }}>
            <Coins size={15} color={c.gold} />
            <Text style={{ fontFamily: fonts.medium, color: c.gold, fontSize: 17 }}>
              {money(g.gold)}
            </Text>
            <Body style={{ fontSize: 11 }}>gold</Body>
          </Row>
          <Row style={{ gap: 6 }}>
            <Swords size={15} color={c.purple} />
            <Text style={{ fontFamily: fonts.medium, color: c.text, fontSize: 17 }}>
              {data[1]!.value}
            </Text>
            <Body style={{ fontSize: 11 }}>adventurers</Body>
          </Row>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 3 }}>
          <Body style={{ fontSize: 10 }}>{data[2]!.value} staff</Body>
          <Body style={{ fontSize: 10 }}>
            {data[3]!.value} / {g.floors.length} floors
          </Body>
        </Row>
      </View>
    );
  return (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 25, marginBottom: 25 }}
    >
      {data.map((d) => (
        <View
          key={d.label}
          style={{
            flex: small ? undefined : 1,
            width: small ? '48%' : undefined,
            backgroundColor: c.panel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 7,
            padding: small ? 14 : 18,
          }}
        >
          <Row style={{ justifyContent: 'space-between', marginBottom: 9 }}>
            <Label>{d.label}</Label>
            <d.icon size={15} color={d.color} strokeWidth={1.6} />
          </Row>
          <Row style={{ alignItems: 'baseline', gap: 7 }}>
            <Heading size={32} style={{ color: d.color }}>
              {d.value}
            </Heading>
            <Body style={{ fontSize: 11 }}>{d.unit}</Body>
          </Row>
          {!small && <Body style={{ fontSize: 10, marginTop: 5, lineHeight: 16 }}>{d.detail}</Body>}
        </View>
      ))}
    </View>
  );
}
function Tutorial({
  g,
  busy,
  compact = false,
  onOpen,
}: {
  onOpen: () => void;
  g: GameState;
  busy: boolean;
  compact?: boolean;
}) {
  const t = TUTORIAL[g.tutorial]!;
  return (
    <Panel style={{ borderColor: '#65503b', backgroundColor: '#28232a', padding: 22 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label color={c.gold}>The first descent</Label>
        <Text style={{ fontFamily: fonts.medium, color: c.dim, fontSize: 11 }}>
          {String(g.tutorial + 1).padStart(2, '0')} / 10
        </Text>
      </Row>
      <View style={{ marginVertical: 16 }}>
        <Progress value={(g.tutorial + 1) / 10} height={3} />
      </View>
      {!compact && (
        <View
          style={{
            width: 53,
            height: 53,
            backgroundColor: '#3c3030',
            borderWidth: 1,
            borderColor: '#68503b',
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <Sprite kind={g.tutorial > 5 ? 'wizard' : 'miner'} size={41} />
        </View>
      )}
      <Heading size={29} style={{ lineHeight: 30 }}>
        {t.title}
      </Heading>
      <Body style={{ marginTop: 13, lineHeight: 22 }}>{t.text}</Body>
      {!compact && (
        <View style={{ marginTop: 20, gap: 11 }}>
          {TUTORIAL.slice(Math.max(0, g.tutorial - 1), Math.min(10, g.tutorial + 2)).map((x, i) => {
            const index = Math.max(0, g.tutorial - 1) + i;
            return (
              <Row key={x.label} style={{ gap: 9 }}>
                <View
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 3,
                    backgroundColor: index < g.tutorial ? c.greenDark : 'transparent',
                    borderWidth: 1,
                    borderColor:
                      index === g.tutorial ? c.gold : index < g.tutorial ? '#5c7c65' : c.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {index < g.tutorial ? (
                    <Check size={10} color={c.green} />
                  ) : index === g.tutorial ? (
                    <View style={{ width: 5, height: 5, backgroundColor: c.gold }} />
                  ) : null}
                </View>
                <Text
                  style={{
                    color: index === g.tutorial ? c.text : c.dim,
                    fontFamily: fonts.body,
                    fontSize: 11,
                    flex: 1,
                  }}
                >
                  {x.label}
                </Text>
              </Row>
            );
          })}
        </View>
      )}
      <Divider />
      <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <Label style={{ fontSize: 9 }}>Your next move</Label>
        <Label color={c.gold} style={{ fontSize: 9 }}>
          {t.cost}
        </Label>
      </Row>
      <Button disabled={busy} pulse testID="tutorial-action" onPress={onOpen} icon={ArrowRight}>
        {t.action}
      </Button>
      <Body style={{ fontSize: 10, textAlign: 'center', marginTop: 11, color: c.dim }}>
        No dark ritual required. Yet.
      </Body>
    </Panel>
  );
}
function Pulse({ g }: { g: GameState }) {
  return (
    <Panel style={{ borderColor: '#4e5c4d', backgroundColor: '#232a27' }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label color={c.green}>Business as unusual</Label>
        <TrendingUp size={16} color={c.green} />
      </Row>
      <Heading size={29} style={{ marginTop: 18 }}>
        Your dungeon{'\n'}has a life of its own.
      </Heading>
      <Body style={{ marginTop: 12 }}>
        The crew is working. Adventurers are exploring. Every gold coin tells a story.
      </Body>
      <Divider />
      <Row style={{ justifyContent: 'space-between' }}>
        <Body>Total earned</Body>
        <Row>
          <Coin />
          <Heading size={23} style={{ color: c.gold }}>
            {money(g.totals.income)}
          </Heading>
        </Row>
      </Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <Body>Completed expeditions</Body>
        <Heading size={23}>{g.totals.visits}</Heading>
      </Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <Body>Treasure reserve</Body>
        <Heading size={23}>{money(g.reserve)} g</Heading>
      </Row>
    </Panel>
  );
}
function PartyPanel({ g, onActor }: { g: GameState; onActor: (a: Actor) => void }) {
  return (
    <Panel>
      <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <Label color={c.text}>The adventurers</Label>
        <Pill background="#302938" color={c.purple}>
          {g.parties.length} ACTIVE PARTIES
        </Pill>
      </Row>
      {g.parties.length ? (
        g.parties.map((p) => (
          <View key={p.id} style={{ marginBottom: 12 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <Body color={c.text}>
                Party #{p.id} · Floor {p.floor}
              </Body>
              <Label color={p.status === 'resting' ? c.purple : c.green}>{p.status}</Label>
            </Row>
            <Row style={{ flexWrap: 'wrap', gap: 7 }}>
              {p.members.map((id) => {
                const a = g.actors.find((a) => a.id === id)!;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${a.name}`}
                    onPress={() => onActor(a)}
                    style={s.actorChip}
                  >
                    <Sprite
                      kind={a.role}
                      saturation={a.outfitSaturation}
                      variant={a.variant}
                      tier={a.outfitTier}
                      size={31}
                    />
                    <View>
                      <Text style={s.actorName}>{a.name}</Text>
                      <Text style={s.actorRole}>{a.role}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </Row>
          </View>
        ))
      ) : (
        <Row>
          <View style={{ flexDirection: 'row', opacity: 0.7 }}>
            <Sprite kind="fighter" size={39} />
            <Sprite kind="wizard" size={39} />
            <Sprite kind="healer" size={39} />
          </View>
          <Body style={{ flex: 1, marginLeft: 6 }}>
            Your future customers are gathering in town.{'\n'}
            {g.opened
              ? 'The next eligible party enters on the hour.'
              : 'Open the dungeon to welcome the first party.'}
          </Body>
        </Row>
      )}
    </Panel>
  );
}

function Build({ g, busy }: { g: GameState; busy: boolean }) {
  return (
    <View style={{ gap: 18 }}>
      <Panel>
        <Row style={{ justifyContent: 'space-between' }}>
          <Heading size={25}>Build from the ground down.</Heading>
          <Pickaxe size={20} color={c.gold} />
        </Row>
        <Body style={{ marginTop: 8 }}>
          Three rested diggers excavate floor 1 in 10 real minutes. Each deeper floor takes 1.5× as
          long. Faster Digging halves these times; queues and rest add waiting time.
        </Body>
        <Divider />
        {g.floors.map((f) => (
          <View
            key={f.id}
            style={{
              paddingVertical: 14,
              borderBottomWidth: f.id === 5 ? 0 : 1,
              borderColor: c.border,
            }}
          >
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Row>
                  <Label color={c.gold}>0{f.id}</Label>
                  <Body color={c.text} style={{ fontFamily: fonts.medium }}>
                    {f.name}
                  </Body>
                </Row>
                <Body style={{ fontSize: 11, marginTop: 5 }}>
                  {f.stage === 'locked'
                    ? `${rule(g, 'cost.develop')} gold · ${excavationMinutes(f.id, g.research.includes('digging'), 3, g)}.toLocaleString('en-US', { maximumFractionDigits: 2 })} min excavation with 3 rested diggers`
                    : f.stage === 'open'
                      ? `${f.encounters.length} encounters · ${f.restSpots} rest spots · ${f.visitors} visitors`
                      : f.stage === 'ready'
                        ? 'Furnished and ready for its first visitors.'
                        : `${f.stage} · ${f.work} / ${f.required} work units`}
                </Body>
              </View>
              {f.stage === 'locked' ? (
                <Button
                  compact
                  secondary
                  disabled={
                    busy ||
                    g.tutorial < 9 ||
                    g.gold < rule(g, 'cost.develop') * 100 ||
                    !g.floors.some((x) => x.id === f.id - 1 && ['ready', 'open'].includes(x.stage))
                  }
                  icon={Plus}
                  onPress={() => void dispatch({ type: 'develop', floor: f.id })}
                >
                  Develop
                </Button>
              ) : f.stage === 'ready' && g.opened ? (
                <Button
                  compact
                  disabled={
                    busy ||
                    (!!f.installation && f.installation !== 'complete') ||
                    (f.id > 1 && g.floors[f.id - 2]!.stage !== 'open')
                  }
                  onPress={() => void dispatch({ type: 'openFloor', floor: f.id })}
                >
                  Open
                </Button>
              ) : (
                <Pill color={statusColor(f.stage)} background="#302b32">
                  {f.stage.toUpperCase()}
                </Pill>
              )}
            </Row>
            {['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage) && (
              <View style={{ marginTop: 12 }}>
                <Progress value={f.required ? f.work / f.required : 0} />
              </View>
            )}
          </View>
        ))}
        {g.floors[4]!.stage === 'open' && (
          <Body color={c.gold}>
            Demo depth reached. Research Dungeon depths to unlock more floors, up to 50.
          </Body>
        )}
      </Panel>
      <Panel>
        <FloorSettings g={g} busy={busy} />
      </Panel>
    </View>
  );
}
function Finance({
  g,
  busy,
  guided = false,
  onComplete,
}: {
  g: GameState;
  busy: boolean;
  guided?: boolean;
  onComplete?: () => void;
}) {
  const [tip, setTip] = useState(0);
  const tips = [
    'Every admitted adventurer pays the entry fee. Parties must afford it. The first floor group admits level-one adventurers.',
    'Choose the share of entry fees reserved for treasure. The remainder pays for staff, construction and research.',
    'Choose how much recovered equipment to sell. Sales fund your treasury; the rest becomes treasure gold.',
    'Maintainers refill chests from reserves. Finish setup to invest 20 gold in starting treasure. Add more later.',
  ];
  const fields = [
    {
      label: 'Entrance fee',
      value: g.fee / 100,
      suffix: ' gold',
      max: 20,
      step: 1,
      type: 'fee' as const,
    },
    {
      label: 'Fees returned to treasure',
      value: g.reinvest,
      suffix: '%',
      max: 100,
      step: 10,
      type: 'reinvest' as const,
    },
    {
      label: 'Found equipment sold',
      value: g.saleRatio,
      suffix: '%',
      max: 100,
      step: 10,
      type: 'saleRatio' as const,
    },
  ];
  const highlight = (i: number) => ({
    padding: 12,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: guided && tip === i ? c.gold : c.border,
    opacity: guided && tip !== i ? 0.35 : 1,
  });
  return (
    <View style={{ gap: 12 }}>
      <Heading>Dungeon finances</Heading>
      {guided && (
        <Panel>
          <Body color={c.gold}>Finance guide {tip + 1} / 4</Body>
          <Body style={{ marginVertical: 10 }}>{tips[tip]}</Body>
          <Row>
            {tip > 0 && (
              <Button secondary compact onPress={() => setTip(tip - 1)}>
                Back
              </Button>
            )}
            {tip < 3 ? (
              <Button pulse compact onPress={() => setTip(tip + 1)}>
                Next tip
              </Button>
            ) : (
              <Button pulse disabled={busy || g.gold < 2000} onPress={() => onComplete?.()}>
                Finish finances · 20 gold
              </Button>
            )}
          </Row>
        </Panel>
      )}
      {fields.map((field, i) => (
        <View key={field.type} style={highlight(i)}>
          <Stepper
            label={field.label}
            value={field.value}
            suffix={field.suffix}
            min={0}
            max={field.max}
            step={field.step}
            disabled={busy || (guided && tip !== i) || (!guided && !g.research.includes('finance'))}
            onChange={(value) => void dispatch({ type: field.type, value })}
          />
        </View>
      ))}
      <View style={highlight(3)}>
        <Heading size={24}>Treasure reserve · {money(g.reserve)} gold</Heading>
        <Body>Maintainers use this gold to refill chests.</Body>
        {!guided && (
          <Button
            disabled={busy || g.gold < 1000 || !g.research.includes('finance')}
            onPress={() => void dispatch({ type: 'fund', amount: 1000 })}
          >
            Add 10 gold
          </Button>
        )}
      </View>
    </View>
  );
}
function Office({
  g,
  busy,
  onActor,
}: {
  g: GameState;
  busy: boolean;
  onActor: (a: Actor) => void;
}) {
  return (
    <View style={{ gap: 18 }}>
      {g.complaints.length > 0 && (
        <Panel>
          <Heading size={24}>The complaints desk</Heading>
          {g.complaints.map((note) => (
            <View key={note.id} style={{ marginTop: 14 }}>
              <Body color={c.red}>{note.message}</Body>
              <Body style={{ fontSize: 11 }}>
                {gameDate(note.time)} · Floor {note.floor}
              </Body>
            </View>
          ))}
        </Panel>
      )}
      <Panel>
        <Row>
          <Sparkles size={18} color={c.purple} />
          <Heading size={25}>Short-sighted training.</Heading>
        </Row>
        <Body style={{ marginTop: 8 }}>
          Give underqualified adventurers +1 to their stats, and make them a little slower to learn.
          Only adventurers below the first-floor entry level can enroll. Those who qualify stop
          training immediately; each person can take at most {g.trainingLimit} courses. A course
          takes 6 dungeon hours.
        </Body>
        <Divider />
        <Stepper
          label="Maximum courses per adventurer"
          value={g.trainingLimit}
          min={0}
          max={3}
          disabled={busy}
          onChange={(value) => void dispatch({ type: 'trainingLimit', value })}
        />
        <Stepper
          label="Course price"
          value={g.trainingPrice}
          suffix=" gold"
          min={1}
          max={5}
          disabled={busy || !g.research.includes('training')}
          onChange={(value) => void dispatch({ type: 'trainingPrice', value })}
        />
        <Row style={{ justifyContent: 'space-between', marginTop: 9 }}>
          <Body>Daily demand</Body>
          <Pill color={c.purple} background="#352c41">
            {10 - g.trainingPrice} SEATS / DAY
          </Pill>
        </Row>
        <Body style={{ marginTop: 12, fontSize: 11 }}>
          {g.actors.filter((a) => a.status === 'training').length} currently training ·{' '}
          {g.totals.training} lifetime enrollments
        </Body>
        {!g.research.includes('training') && (
          <Body color={c.gold} style={{ fontSize: 11, marginTop: 8 }}>
            Unlocked after your first underqualified visitors arrive.
          </Body>
        )}
      </Panel>
      <Panel>
        <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <Heading size={25}>The people behind the spikes.</Heading>
          <Users size={18} color={c.green} />
        </Row>
        {g.actors.filter((a) => ['miner', 'maintenance', 'defender'].includes(a.role)).length ===
          0 && <Body>Hire your first miners in the setup guide.</Body>}
        {g.actors
          .filter((a) => ['miner', 'maintenance', 'defender'].includes(a.role))
          .map((a) => (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              onPress={() => onActor(a)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: c.border,
              }}
            >
              <View style={{ backgroundColor: '#2c2832', borderRadius: 5 }}>
                <Sprite
                  kind={a.role}
                  saturation={a.outfitSaturation}
                  variant={a.variant}
                  tier={a.outfitTier}
                  size={43}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actorName}>{a.name}</Text>
                <Body style={{ fontSize: 11 }}>
                  {a.role === 'miner'
                    ? 'Miner & builder'
                    : a.role === 'defender'
                      ? 'HQ defender'
                      : 'Maintenance'}{' '}
                  · {a.status}
                </Body>
                <View style={{ marginTop: 5, maxWidth: 160 }}>
                  <Progress value={a.stamina / a.maxStamina} color={c.green} height={3} />
                </View>
              </View>
              <Body style={{ fontSize: 11 }}>
                {a.stamina}/{a.maxStamina} <Zap size={11} color={c.green} />
              </Body>
              <ChevronRight size={15} color={c.dim} />
            </Pressable>
          ))}
      </Panel>
    </View>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  suffix = '',
  step = 1,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 8, gap: 7 }}>
      <Body color={c.text} style={{ flex: 1, fontSize: 12 }}>
        {label}
      </Body>
      <Row style={{ gap: 5 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={disabled || value <= min}
          onPress={() => onChange(Math.max(min, value - step))}
          style={[s.stepButton, { opacity: disabled || value <= min ? 0.3 : 1 }]}
        >
          <Text style={{ fontFamily: fonts.medium, color: c.text, fontSize: 17 }}>−</Text>
        </Pressable>
        <Text
          style={{
            fontFamily: fonts.medium,
            color: c.gold,
            fontSize: 12,
            minWidth: 63,
            textAlign: 'center',
          }}
        >
          {value}
          {suffix}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={disabled || value >= max}
          onPress={() => onChange(Math.min(max, value + step))}
          style={[s.stepButton, { opacity: disabled || value >= max ? 0.3 : 1 }]}
        >
          <Plus size={13} color={c.text} />
        </Pressable>
      </Row>
    </Row>
  );
}
function SkillXp({
  stat,
  xp,
  required,
  reduced,
}: {
  stat: Stat;
  xp: number;
  required: number;
  reduced: boolean;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const ready = xp >= required;
  useEffect(() => {
    opacity.setValue(1);
    if (!ready || reduced) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [ready, reduced, opacity]);
  return (
    <View
      testID={`xp-${stat}`}
      accessibilityLabel={`${xp}/${required} XP${ready ? ', ready to level up' : ''}`}
      style={{ marginTop: 5 }}
    >
      <Animated.View style={{ opacity }}>
        <Progress value={Math.min(1, xp / required)} color={c.gold} />
      </Animated.View>
      <Body color={c.gold} style={{ fontSize: 11, marginTop: 3 }}>
        {xp}/{required} XP{ready ? ` · +${Math.floor(xp / required)} ready` : ''}
      </Body>
    </View>
  );
}
function ActorDetails({ actor: a, reduced, g }: { actor: Actor; reduced: boolean; g: GameState }) {
  const activity = actorActivity(g, a);
  const primary =
    a.role === 'wizard'
      ? 'Mana'
      : a.role === 'healer'
        ? 'Divinity'
        : a.role === 'fighter' || a.role === 'defender'
          ? 'Strength'
          : 'Craft';
  const skills: { stat: Stat; label: string; value: number; max?: number; color: string }[] = [
    {
      stat: 'primary',
      label: primary,
      value: primaryAvailable(a),
      max: a.primary,
      color: outfitColor(a.role, a.outfitSaturation),
    },
    { stat: 'maxDefense', label: 'Defense', value: a.defense, max: a.maxDefense, color: '#6ea8ff' },
    { stat: 'maxHealth', label: 'Health', value: a.health, max: a.maxHealth, color: '#e56a75' },
    { stat: 'maxStamina', label: 'Stamina', value: a.stamina, max: a.maxStamina, color: c.green },
    { stat: 'damage', label: 'Damage', value: a.damage, color: c.text },
    { stat: 'intelligence', label: 'Intelligence', value: a.intelligence, color: c.text },
    { stat: 'speed', label: 'Speed', value: a.speed, color: c.text },
  ];
  return (
    <>
      <Row style={{ gap: 18 }}>
        <View style={{ backgroundColor: '#302a38', borderRadius: 8, padding: 14 }}>
          <Sprite
            kind={a.role}
            saturation={a.outfitSaturation}
            variant={a.variant}
            tier={a.outfitTier}
            size={65}
          />
        </View>
        <View>
          <Pill color={outfitColor(a.role, a.outfitSaturation)} background="#352c41">
            LEVEL {level(a)} · {a.status.toUpperCase()}
          </Pill>
          <Body style={{ marginTop: 10 }}>Wealth: {money(a.wealth)} gold</Body>
          <Body>
            Skill XP:{' '}
            {Object.values(a.bankedXp).reduce((n, xp) => n + xp, 0) +
              Object.values(a.pendingXp).reduce((n, xp) => n + xp, 0)}
          </Body>
        </View>
      </Row>
      <Divider />
      <View testID="actor-current">
        <Body>Currently: {activity.current}</Body>
      </View>
      <View testID="actor-next">
        <Body style={{ marginBottom: 14 }}>Queued: {activity.next}</Body>
      </View>
      {skills.map((x) => (
        <View key={x.stat} testID={`skill-${x.stat}`} style={{ marginBottom: 14 }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 5 }}>
            <Body color={x.color}>
              {x.label}
              {x.stat === 'primary' ? ' · Primary skill' : ''}
            </Body>
            <Body color={x.color}>
              {x.value}
              {x.max !== undefined ? ` / ${x.max}` : ''}
            </Body>
          </Row>
          {x.max !== undefined && <Progress value={x.value / x.max} color={x.color} />}
          <SkillXp
            stat={x.stat}
            xp={a.bankedXp[x.stat] + a.pendingXp[x.stat]}
            required={a.learning}
            reduced={reduced}
          />
        </View>
      ))}
      <Body>
        Primary skill use spends 1 point and earns 1 XP. Health, defense, stamina and primary
        recover 1 point every 2 quiet game hours, four times as fast in a rest room (1 point every
        30 game minutes). Adventurers apply gains at the floor exit; staff apply gains when admitted
        to the office rest room. Overflow carries into the next skill point.
      </Body>
    </>
  );
}
function FloorDetails({ floor: f, g, busy }: { floor: Floor; g: GameState; busy: boolean }) {
  return (
    <>
      <Pill color={statusColor(f.stage)} background="#322b36">
        FLOOR {f.id} · {f.stage.toUpperCase()}
      </Pill>
      <Body style={{ marginTop: 14 }}>
        {f.encounters.length} encounter slots used · {f.restSpots} rest spots · {f.visitors}{' '}
        visitors
      </Body>
      {!['ready', 'open'].includes(f.stage) ? (
        <Body style={{ marginTop: 16 }}>
          Manage this floor in the Build tab.{' '}
          {f.stage !== 'locked' && `${f.work} of ${f.required} work units completed.`}
        </Body>
      ) : (
        <>
          <Divider />
          {f.encounters.map((e) => (
            <Row key={e.id} style={{ justifyContent: 'space-between', marginVertical: 7 }}>
              <Body color={c.text} style={{ textTransform: 'capitalize' }}>
                {e.kind === 'trapdoor' ? 'Trap door' : e.kind}
              </Body>
              <Body>
                {e.capacity
                  ? `${money(e.gold)} / ${money(e.capacity)} gold`
                  : e.active
                    ? `Armed · ${e.damage} damage`
                    : 'Awaiting reset / spawn'}
              </Body>
            </Row>
          ))}
          <Divider />
          <Row style={{ justifyContent: 'space-between' }}>
            <Body>
              Rest occupancy: {f.restOccupants.length} / {g.policy.restCapacity} ·{' '}
              {f.restQueue.length} parties queued
            </Body>
            <BedDouble size={20} color={c.purple} />
          </Row>
          <Button
            secondary
            disabled={busy || g.policy.restCapacity >= 30 || g.gold < rule(g, 'cost.rest') * 100}
            onPress={() => void dispatch({ type: 'rest', floor: f.id })}
            style={{ marginTop: 16 }}
            icon={Plus}
          >
            {g.policy.restCapacity >= 30
              ? 'Maximum rest capacity reached'
              : `${rule(g, 'cost.rest')} gold · +1 rest`}
          </Button>
          {f.stage === 'ready' && g.opened && (
            <Button
              disabled={
                busy ||
                (!!f.installation && f.installation !== 'complete') ||
                (f.id > 1 && g.floors[f.id - 2]!.stage !== 'open')
              }
              onPress={() => void dispatch({ type: 'openFloor', floor: f.id })}
              style={{ marginTop: 10 }}
            >
              Open this floor
            </Button>
          )}
        </>
      )}
    </>
  );
}
function Dialog({
  visible,
  onClose,
  title,
  children,
  scrollTarget,
}: {
  scrollTarget?: number;
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const contentScroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollTarget !== undefined)
      contentScroll.current?.scrollTo({ y: scrollTarget, animated: true });
  }, [scrollTarget]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close dialog backdrop"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.modalCard}>
          <Row
            style={{
              justifyContent: 'space-between',
              padding: 23,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}
          >
            <Heading size={28} style={{ flex: 1 }}>
              {title}
            </Heading>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              style={s.iconButton}
            >
              <X size={19} color={c.muted} />
            </Pressable>
          </Row>
          <ScrollView ref={contentScroll} contentContainerStyle={{ padding: 23 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, flexDirection: 'row' },
  sidebar: {
    width: 219,
    backgroundColor: c.sidebar,
    borderRightWidth: 1,
    borderColor: '#2b2731',
    paddingHorizontal: 14,
    paddingTop: 29,
    paddingBottom: 12,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 5,
    paddingHorizontal: 14,
    minHeight: 45,
  },
  navSelected: { backgroundColor: '#33291f', borderWidth: 1, borderColor: '#57412c' },
  navText: { fontFamily: fonts.medium, color: c.muted, fontSize: 13 },
  navDot: { width: 4, height: 4, borderRadius: 3, backgroundColor: c.gold, marginLeft: 'auto' },
  dot: { width: 6, height: 6, borderRadius: 4 },
  sidebarQuote: {
    backgroundColor: '#211d29',
    borderWidth: 1,
    borderColor: '#332b40',
    borderRadius: 7,
    padding: 15,
    marginHorizontal: 5,
    marginTop: 22,
  },
  topbar: {
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#2d2933',
  },
  clock: {
    gap: 8,
    backgroundColor: '#242129',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#38323e',
  },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1c1923',
    borderTopWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 15 : 5,
  },
  actorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#29252f',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: c.border,
    paddingRight: 12,
    paddingVertical: 7,
    paddingLeft: 4,
  },
  actorName: { fontFamily: fonts.medium, color: c.text, fontSize: 12 },
  actorRole: {
    fontFamily: fonts.body,
    color: c.dim,
    fontSize: 10,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  stepButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: '#2c2733',
    borderRadius: 4,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    left: '10%',
    right: '10%',
    maxWidth: 600,
    marginHorizontal: 'auto',
    backgroundColor: '#342b31',
    borderWidth: 1,
    borderColor: '#70583b',
    borderRadius: 7,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 100,
  },
  processing: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    left: '20%',
    right: '20%',
    backgroundColor: c.panel,
    borderWidth: 1,
    borderColor: c.border,
    padding: 15,
    borderRadius: 6,
    flexDirection: 'row',
    gap: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#08060de0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 530,
    maxHeight: '86%',
    backgroundColor: c.panel,
    borderWidth: 1,
    borderColor: '#554755',
    borderRadius: 10,
    overflow: 'hidden',
  },
});
