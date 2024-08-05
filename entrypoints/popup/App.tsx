import { createSignal, createRenderEffect } from "solid-js";
import { ResponseType } from "@/src/types";
import "./App.css";
import { Tabs } from "wxt/browser";
import { sendMessage } from "./messaging";
import groupby from "lodash.groupby";

import PhGlobeSimpleDuotone from '~icons/ph/globe-simple-duotone';
import PhArrowClockwise from '~icons/ph/arrow-clockwise';
import PhX from '~icons/ph/x';
import PhSubsetOf from '~icons/ph/subset-of';
import PhCaretDown from '~icons/ph/caret-down';
import PhCaretLeft from '~icons/ph/caret-left';

import { capitalize } from "@/src/lib/text";

import PhMagnifyingGlass from '~icons/ph/magnifying-glass';
import { JSX } from "solid-js";

const numStr = (num: number, singular: string, plural: string) =>
  `${num} ${num === 1 ? singular : plural}`;

const tabsDataFecther = async () => {
  try {
    const dataDirect: ResponseType<Tabs.Tab[]> = await sendMessage({
      type: "getTabs",
    });
    // console.log('Data direct:', dataDirect);
    return dataDirect.data;
  } catch (e) {
    // console.error('Error getting tabs data:', e);
    return [];
  }
};

const groupByTypeArray = [
  "domain",
  "window",
  "active",
  "time",
  "audio",
  "article",
  "pinned",
  "duplicate",
] as const;
type GroupByType = (typeof groupByTypeArray)[number];

interface GroupByData {
  type: GroupByType;
  groupKey: (tab: Tabs.Tab) => string;
  groupFilter?: (key: string, tabs: Tabs.Tab[]) => boolean;
}

const groupBy: GroupByData[] = [
  {
    type: "domain",
    groupKey: (tab: Tabs.Tab) => {
      if (!tab.url) return "No URL";
      const url = new URL(tab.url);
      return url.hostname;
    },
  },
  {
    type: "window",
    groupKey: (tab: Tabs.Tab) => {
      return tab.windowId?.toString() ?? "No Window";
    },
  },
  {
    type: "article",
    groupKey: (tab: Tabs.Tab) => {
      return tab.isArticle ? "Article" : "Not Article";
    },
  },
  {
    type: "pinned",
    groupKey: (tab: Tabs.Tab) => {
      return tab.pinned ? "Pinned" : "Unpinned";
    },
  },
  {
    type: "active",
    groupKey: (tab: Tabs.Tab) => {
      return (tab.active || !tab.discarded) ? "Active" : "Inactive";
    },
  },
  {
    type: "time",
    groupKey: (tab: Tabs.Tab) => {
      const date = new Date(tab.lastAccessed!);
      return `${date.getMonth()}-${date.getFullYear()}`;
    },
  },
  {
    type: "audio",
    groupKey: (tab: Tabs.Tab) => {
      const isMuted = tab.mutedInfo?.muted;
      if (isMuted) return "Muted";
      const isAudible = tab.audible;
      if (isAudible) return "Audible";
      return "Silent";
    },
  },
  {
    type: "duplicate",
    groupKey: (tab: Tabs.Tab) => tab.url ?? "No URL",
    // Which groups to filter out
    groupFilter: (_key: string, tabs: Tabs.Tab[]) => tabs.length > 1,
  },
];

const ConfirmDelete = (props: {
  label: JSX.Element;
  title?: string;
  bypass?: boolean;
  onConfirm: () => void;
}) => {
  const [showConfirm, setShowConfirm] = createSignal(false);

  return (
    <div class="confirm-wrapper row"
      classList={{ open: showConfirm() }}
    >
      <button
        onClick={() => {
          if (props.bypass === true) { props.onConfirm() } else setShowConfirm(true);
        }}
        disabled={showConfirm()}
        title={props.title}
        aria-label={props.title}
      >
        {props.label}
      </button>

      <Show when={showConfirm()}>
        <div class="confirm-prompt row">
          <button
            onClick={() => {
              props.onConfirm();
              setShowConfirm(false);
            }}
          >
            Yes
          </button>
          <button onClick={() => setShowConfirm(false)}>No</button>
        </div>
      </Show>
    </div>
  );
};

const TabRow = (props: { tab: Tabs.Tab; refetch: () => void }) => (
  <div class="tabrow">
    <button
      onClick={() =>
        sendMessage({ type: "openTab", data: props.tab.id })
      }
      class="tabdetails">
      <Show when={props.tab.favIconUrl}>
        <img src={props.tab.favIconUrl} alt="f" class="favicon" />
      </Show>
      <Show when={!props.tab.favIconUrl}>
        <div class="favicon">
          <PhGlobeSimpleDuotone width="1em" height="1em" />
        </div>
      </Show>
      <div class="tabText">
        {props.tab.title}
      </div>
    </button>
    <button
      class="close"
      title="Close Tab"
      onClick={() =>
        sendMessage({ type: "closeTabs", data: [props.tab.id] }).finally(
          props.refetch,
        )
      }
    >
      <PhX />
    </button>
  </div>
);

const GroupedTabs = (props: {
  groupType: GroupByType;
  grouped: [string, Tabs.Tab[]][];
  refetch: () => void;
  bypassConfirmClose?: boolean;
}) => {
  const [expanded, setExpanded] = createSignal<Record<string, boolean>>(
    props.grouped.reduce(
      (acc, [key]) => {
        acc[key] = false;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  const toggleExpanded = (key: string) => {
    const expandedValue = { ...expanded() };
    expandedValue[key] = !expandedValue[key];
    setExpanded((exp) => ({ ...exp, [key]: !exp[key] }));
  };

  // console.log('Expanded:', expanded());

  return (
    <For
      each={props.grouped.sort(
        ([_keyA, tabsA], [_keyB, tabsB]) => tabsB.length - tabsA.length,
      )}
    >
      {([key, tabs]) => (
        <div class="group">
          <div class="row">
            <div>{tabs.length}</div>
            <h2>{key}</h2>
            <button class="iconButton" onClick={() => toggleExpanded(key)}>
              {expanded()[key] ? <PhCaretDown /> : <PhCaretLeft />}
              {/* {expanded()[key] ? "Collapse" : "Expand"} */}
            </button>
            <ConfirmDelete
              label={<><PhX />n</>}
              title="Close All"
              onConfirm={() =>
                sendMessage({
                  type: "closeTabs",
                  data: tabs.map((tab) => tab.id),
                }).finally(props.refetch)
              }
            />
            <Show when={props.groupType === "duplicate"}>
              <ConfirmDelete
                bypass={props.bypassConfirmClose}
                label={<><PhX />n⁻¹</>}
                title="Close All but one"
                onConfirm={() =>
                  sendMessage({
                    type: "closeTabs",
                    data: tabs.map((tab) => tab.id).slice(1),
                  }).finally(props.refetch)
                }
              />
            </Show>
          </div>
          <div class="list">
            <Show when={expanded()[key]}>
              <For each={tabs}>
                {(tab) => <TabRow tab={tab} refetch={props.refetch} />}
              </For>
            </Show>
          </div>
        </div>
      )}
    </For>
  );
};

function App() {
  // const [tabsData, setTabsData] = createSignal<Tabs.Tab[]>([]);
  const [tabsData, { refetch }] = createResource(async () => tabsDataFecther());

  const [filter, setFilter] = createSignal<string>("");
  const [showSelect, setShowSelect] = createSignal(false);

  let filterInputRef: HTMLInputElement;

  const [groupByIndex, setGroupByIndex] = createSignal<GroupByType | undefined>(
    undefined,
  );

  const groupedTabs = () => {
    if (!groupByIndex()) return [];
    const groupByData = groupBy.find((group) => group.type === groupByIndex());
    if (!groupByData) return [];
    const gtabs = groupby(filtered(), groupByData.groupKey);
    const filteredgTabs = groupByData.groupFilter
      ? Object.entries(gtabs).filter(([key, tabs]) =>
        groupByData.groupFilter!(key, tabs),
      )
      : Object.entries(gtabs);
    return filteredgTabs.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  };

  const filtered = () => {
    if (!filter() || filter() === "") return tabsData() ?? [];
    if (!tabsData()) return [];
    return tabsData()!.filter(
      (tab) =>
        tab.title?.toLowerCase().includes(filter().toLowerCase()) ||
        tab.url?.toLowerCase().includes(filter().toLowerCase()),
    );
  };

  const filterCount = () => {
    return filtered().length;
  }

  const groupCount = () => {
    return [groupedTabs().length, groupedTabs().reduce((acc, [_, tabs]) => acc + tabs.length, 0)] as const;
  }

  const closeFiltered = () => {
    const filteredTabs = filtered();
    if (!filteredTabs || filteredTabs.length === 0) return;
    sendMessage({
      type: "closeTabs",
      data: filtered()!.map((tab) => tab.id),
    }).finally(refetch);
  };

  onMount(() => {
    console.log('Focus:', filterInputRef);
    if (filterInputRef) { filterInputRef!.focus() };

  });

  return (
    <>
      <div class="flow popup">
        <header>
          <div class="row">
            <img src="logo64.svg" alt="browserquery icon" class="logo-icon" />
            {/* {numStr(tabsData()?.filter(tab => tab.discarded).length ?? 0, "Discarded Tab", "Discarded Tabs")} */}
            <Show when={filter() || groupByIndex()}>
              <Show when={filter()}>
                <div>
                  {numStr(filterCount(), "Filtered Tab", "Filtered Tabs")}
                </div>
              </Show>
              <Show when={groupByIndex()}>
                <div>
                  {numStr(groupCount()[0], "Group", "Groups")}
                  ({numStr(groupCount()[1], "Tab", "Tabs")})
                </div>
              </Show>
            </Show>
            <div>
              {numStr(tabsData()?.length ?? 0, "T", "Ts")}
            </div>
          </div>
          <button
            class="iconButton"
            title="Refresh"
            onClick={refetch}>
            <PhArrowClockwise />
          </button>
        </header>
        <div class="flow sticky-controls">
          <div class="actionrow">
            <input
              ref={filterInputRef!}
              type="text"
              placeholder="Filter by title or URL"
              onInput={(e) => setFilter(e.currentTarget.value)}
            />

            <button onClick={() => setShowSelect(s => !s)}>
              <PhSubsetOf />
              {groupByIndex() === undefined ? "Group By" : capitalize(groupByIndex()!)}
            </button>

            <Show when={filter() && filterCount() > 0}>
              <ConfirmDelete onConfirm={closeFiltered} label="Close Filtered" />
            </Show>
          </div>
          <div class="row">
            <Show when={showSelect()}>
              <For each={groupBy}>
                {(g) => (<button
                  classList={{ selected: groupByIndex() === g.type }}
                  onClick={() => { setGroupByIndex(g.type); }}>{capitalize(g.type)}</button>)}
              </For>
              <div class="grow-spacer"></div>
              <button
                title="Clear Group By"
                class="iconButton"
                onClick={() => {
                  setGroupByIndex(undefined);
                  setShowSelect(false);
                }}>
                <PhX />
              </button>
            </Show>
          </div>
        </div>
        <div class="results">
          <Show when={!groupByIndex()}>
            <div class="list">
              <For each={filtered()}>
                {(tab) => <TabRow tab={tab} refetch={refetch} />}
              </For>
            </div>
          </Show>
          <Show when={groupByIndex()}>
            <GroupedTabs
              groupType={groupByIndex()!}
              grouped={groupedTabs()}
              refetch={refetch}
              bypassConfirmClose={groupByIndex() === "duplicate"}
            />
          </Show>
        </div>
        <footer>
          v0.1.0 -
          With {`<`}3 from <a href="https://www.xypnox.com/" target="_blank" rel="noreferrer">xypnox</a>
        </footer>
      </div>
    </>
  );
}

export default App;
