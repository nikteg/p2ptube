import { compose } from "@typed/compose"
import { WebGroup, WebGroupState } from "netflux"
import { createConnectedStore, Effects, Store, withReduxDevtools } from "undux"

let wg: WebGroup | null = null

export type MessageType = "videoId" | "videoState" | "videoTime"

const serialize = (type: MessageType, payload: object) => JSON.stringify({ type, payload })

const effects: StoreEffects = (store) => {
  store.on("roomId").subscribe((roomId) => {
    if (roomId) {
      if (wg) {
        wg.leave()
      }

      wg = new WebGroup()

      wg.onMyId = store.set("myId")

      wg.onMemberJoin = (id) => {
        store.set("members")(wg!.members.slice(0).sort())
        store.set("latestMember")(id)

        if (store.get("videoId") && store.get("isHosting")) {
          wg!.sendTo(id, serialize("videoId", { videoId: store.get("videoId")! }))
        }
      }

      wg.onMemberLeave = (id) => {
        store.set("members")(wg!.members.slice(0).sort())
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
      }

      wg.join(roomId)
    }
  })

  store.on("videoId").subscribe((videoId) => {
    if (wg && videoId && store.get("isHosting")) {
      wg.send(serialize("videoId", { videoId }))
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

  return store
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
}

// Create & export a store with an initial value.
export default createConnectedStore(
  initialState,
  compose(
    effects,
    withReduxDevtools,
  ),
)

// Export prop types for React.
export type StoreProps = {
  store: Store<State>
}

// Export a concrete type for effects.
export type StoreEffects = Effects<State>
