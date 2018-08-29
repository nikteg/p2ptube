import * as React from "react"
import * as ReactDOM from "react-dom"
import App from "./App"
import "./index.css"
import registerServiceWorker from "./registerServiceWorker"
import Store from "./store"

ReactDOM.render(
  <Store.Container>
    <App />
  </Store.Container>,
  document.getElementById("root") as HTMLElement,
)
registerServiceWorker()
