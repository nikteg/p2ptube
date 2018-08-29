import * as React from "react"
import YouTube from "react-youtube"
import "./App.css"
import logo from "./logo.svg"
import store, { StoreProps } from "./store"

type State = {
  playerInstance: YT.Player | null
}

type Props = StoreProps

class App extends React.Component<Readonly<Props>, State> {
  state: State = {
    playerInstance: null,
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

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Synced YouTube</h1>
        </header>
        <div className="App-intro">
          <div>
            {store.get("roomId") && (
              <h1>
                Currently {isHosting ? "hosting" : "joined"} room {roomId}
              </h1>
            )}
            {!store.get("roomId") && <h1>Please host or join room</h1>}
            {store.get("members").length > 0 && <h1>Party members</h1>}
            {store.get("members").map((id) => (
              <div key={id} className={store.get("myId") === id ? "me" : ""}>
                {id}
              </div>
            ))}
          </div>
          <div>
            <input type="text" id="roomId" defaultValue={roomId} placeholder="Room ID" />
            <button
              onClick={() => {
                store.set("isHosting")(true)
                store.set("roomId")(String(Date.now()))
              }}
            >
              Host
            </button>
            <button onClick={() => store.set("roomId")((document.getElementById("roomId") as HTMLInputElement).value)}>
              Join
            </button>
          </div>
          <div>
            <input type="text" id="videoId" defaultValue={videoId || ""} placeholder="Wro0VE6i-XM" />
            <button
              onClick={() => store.set("videoId")((document.getElementById("videoId") as HTMLInputElement).value)}
            >
              Load youtube video
            </button>
          </div>
          <div>
            {videoId && (
              <YouTube
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
            )}
          </div>
        </div>
      </div>
    )
  }
}

export default store.withStore(App)
