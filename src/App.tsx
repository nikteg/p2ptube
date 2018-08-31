import "./App.css"

import * as React from "react"
import YouTube from "react-youtube"

import store, { StoreProps } from "./store"

type State = {
  playerInstance: YT.Player | null
  roomIdValue: string
}

type Props = StoreProps

class App extends React.Component<Readonly<Props>, State> {
  state: State = {
    playerInstance: null,
    roomIdValue: "",
  }

  componentDidMount() {
    this.props.store.on("videoState").subscribe((videoState) => {
      if (videoState === "paused") this.state.playerInstance!.pauseVideo()
      if (videoState === "playing") this.state.playerInstance!.playVideo()
    })

    this.props.store.on("videoTime").subscribe((videoTime) => {
      if (Math.abs(this.props.store.get("videoTime") - videoTime) > 2) {
        this.state.playerInstance!.seekTo(videoTime, true)
      }
    })
  }

  public render() {
    const { store } = this.props

    const roomId = store.get("roomId") || ""
    const videoId = store.get("videoId")
    const isHosting = store.get("isHosting")

    // TODO: This probably re-renders this component every frame-ish
    //@ts-ignore
    const title = this.state.playerInstance ? this.state.playerInstance.getVideoData().title : "No video loaded"

    return (
      <div className="App">
        <div className="App-content">
          <header className="App-header">
            <div className="App-title">
              <a href="./">Synced YouTube</a>
            </div>
            <div className="App-video-name">
              <div className="title">{title}</div>
              <div className="badges">
                {isHosting && <span className="hosting">Hosting</span>}
                {Boolean(store.get("roomId")) && <span className="people">{store.get("members").length} viewers</span>}
              </div>
            </div>
            <div className="App-video-input">
              {Boolean(store.get("roomId")) && (
                <>
                  <input
                    type="text"
                    id="videoId"
                    readOnly={!isHosting}
                    defaultValue="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  />
                  <button
                    disabled={!isHosting}
                    onClick={() =>
                      store.set("videoId")(getVideoID((document.getElementById("videoId") as HTMLInputElement).value))
                    }
                  >
                    Play
                  </button>
                </>
              )}
            </div>
          </header>
          <div className="App-video">
            {videoId ? (
              <YouTube
                opts={{ playerVars: { autoplay: 1 } }}
                videoId={videoId}
                onPlay={() => store.set("videoState")("playing")}
                onPause={() => store.set("videoState")("paused")}
                onReady={({ target }: { target: YT.Player }) => this.setState({ playerInstance: target })}
                onStateChange={({ data }) => {
                  if (data === YT.PlayerState.PLAYING) {
                    store.set("videoTime")(this.state.playerInstance!.getCurrentTime())
                  }
                }}
              />
            ) : (
              <div>Video goes here</div>
            )}
          </div>
        </div>
        <div className="App-sidebar">
          <div className="App-roominfo">
            <input
              type="text"
              id="roomId"
              readOnly={Boolean(store.get("roomId"))}
              value={store.get("roomId") ? roomId : this.state.roomIdValue}
              placeholder="Room ID"
              onChange={({ target }) => this.setState({ roomIdValue: target.value })}
            />
            {!store.get("roomId") && (
              <>
                <button
                  onClick={() => {
                    store.set("isHosting")(false)
                    store.set("roomId")(this.state.roomIdValue)
                  }}
                >
                  Join
                </button>
                <div className="seperator" />
                <button
                  onClick={() => {
                    store.set("isHosting")(true)
                    store.set("roomId")(String(Date.now()))
                  }}
                >
                  Host
                </button>
              </>
            )}
            {store.get("roomId") && <button onClick={() => store.set("roomId")(null)}>Leave</button>}
          </div>
          <div className="App-chat">
            <div className="App-chat-content">
              {store.get("chat").map((entry, i) => (
                <div key={i}>
                  {entry.author}: {entry.text}
                </div>
              ))}
            </div>
            {/* <input type="text" placeholder="Enter message..." /> */}
          </div>
        </div>
      </div>
    )
  }
}

function getVideoID(input: string) {
  try {
    const url = new URL(input)

    if (url.searchParams.has("v")) {
      return url.searchParams.get("v")
    }

    return null
  } catch {
    // Input was not an URL, assume it was a video ID
    return input
  }
}

export default store.withStore(App)
