import { compose } from "@typed/compose"
import { WebGroup, WebGroupState } from "netflux"
import { createConnectedStore, Effects, Store, withLogger } from "undux"
let wg: WebGroup | null = null

export type MessageType = "videoId" | "videoState" | "videoTime"

const serialize = (type: MessageType, payload: object) => JSON.stringify({ type, payload })

const effects: StoreEffects = (store) => {
  store.on("roomId").subscribe((roomId) => {
    if (roomId) {
      history.pushState(null, undefined, location.origin + location.pathname + "?room=" + roomId)

      if (wg) {
        wg.leave()
      }

      wg = new WebGroup()

      wg.onMyId = (id: number) => {
        store.set("myId")(id)
        store.set("members")([id])
      }

      wg.onMemberJoin = (id) => {
        store.set("members")(wg!.members.slice(0).sort())
        store.set("latestMember")(id)

        store.set("chat")(store.get("chat").concat([{ author: id, text: "joined" }]))

        if (store.get("videoId") && store.get("isHosting")) {
          wg!.sendTo(id, serialize("videoId", { videoId: store.get("videoId")! }))
          wg!.sendTo(id, serialize("videoState", { videoId: store.get("videoState")! }))
        }
      }

      wg.onMemberLeave = (id) => {
        store.set("members")(wg!.members.slice(0).sort())
        store.set("chat")(store.get("chat").concat([{ author: id, text: "left" }]))
      }

      wg.onMessage = (id, data) => {
        console.log(`Message from ${id} group member`, data)
        if (typeof data === "string") {
          const { type, payload } = JSON.parse(data)

          if (type === "videoId") {
            store.set("videoId")(payload.videoId)
          }
          if (type === "videoState") {
            store.set("videoState")(payload.videoState)
          }
          if (type === "videoTime") {
            store.set("videoTime")(payload.videoTime)
          }
        }
      }

      wg.onStateChange = (state) => {
        store.set("connectionState")(state)

        // If you were the first in the group, you're the host
        // TODO: This is kinda buggy atm
        if (state === WebGroupState.JOINED && wg!.members.length === 1) {
          store.set("isHosting")(true)
        }
      }

      wg.join(roomId)
    } else {
      store.set("isHosting")(false)
      store.set("members")([])
      store.set("latestMember")(null)
      store.set("videoTime")(0)
      store.set("chat")([])
      store.set("videoId")(null)
      store.set("videoState")("paused")

      history.replaceState(null, undefined, location.origin + location.pathname)
    }
  })

  store.on("videoId").subscribe((videoId) => {
    if (wg && videoId && store.get("isHosting")) {
      wg.send(serialize("videoId", { videoId }))
      store.set("chat")(store.get("chat").concat([{ author: store.get("myId")!, text: "Loaded video " + videoId }]))
    }
  })

  store.on("videoState").subscribe((videoState) => {
    if (wg && store.get("isHosting")) {
      wg.send(serialize("videoState", { videoState }))
    }
  })

  store.on("videoTime").subscribe((videoTime) => {
    if (wg && store.get("isHosting")) {
      wg.send(serialize("videoTime", { videoTime }))
    }
  })

  const url = new URL(location.href)

  if (url.searchParams.has("room")) {
    store.set("roomId")(url.searchParams.get("room"))
  }

  return store
}

type ChatEntry = {
  author: number
  text: string
}

// Declare your store's types.
type State = {
  isHosting: boolean
  roomId: string | null
  myId: number | null
  connectionState: WebGroupState
  members: number[]
  latestMember: number | null
  videoId: string | null
  videoState: "paused" | "playing"
  videoTime: number
  chat: ChatEntry[]
}

// Declare your store's initial state.
const initialState: State = {
  isHosting: false,
  roomId: null,
  myId: null,
  connectionState: WebGroupState.JOINING,
  members: [],
  latestMember: null,
  videoId: null,
  videoState: "paused",
  videoTime: 0,
  chat: [],
}

// Create & export a store with an initial value.
export default createConnectedStore(
  initialState,
  compose(
    effects,
    withLogger,
  ),
)

// Export prop types for React.
export type StoreProps = {
  store: Store<State>
}

// Export a concrete type for effects.
export type StoreEffects = Effects<State>
