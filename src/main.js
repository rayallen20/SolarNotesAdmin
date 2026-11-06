import {createApp} from "vue";
import App from "@/App.vue";
import pinia from "@/stores";
import ElementPlus from 'element-plus';
import router from "@/router";
import './styles/element.scss'

const app = createApp(App)

app.use(pinia)
app.use(ElementPlus)
app.use(router)

app.mount("#app")
