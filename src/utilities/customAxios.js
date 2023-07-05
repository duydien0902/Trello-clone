import axios from 'axios'
import { toast } from 'react-toastify'
import { signOutUserAPI } from 'redux/user/userSlice'
import { refreshTokenAPI } from 'actions/ApiCall'
// How can I use the Redux store in non-component files?
// https://redux.js.org/faq/code-structure#how-can-i-use-the-redux-store-in-non-component-files
// Inject store
let store
export const injectStore = _store => {
  store = _store
}

let authorizedAxiosInstance = axios.create()
authorizedAxiosInstance.defaults.timeout = 1000 * 60 * 10 // 10 phut
authorizedAxiosInstance.defaults.withCredentials = true // Sẽ cho phép axios tự động gửi cookie trong mỗi request lên BE

// Kỹ thuật dùng css pointer-event để chặn user click nhanh tại bất kỳ chỗ nào có hành động click gọi api
// Đây là một kỹ thuật rất hay tận dụng Axios Interceptors và CSS Pointer-event để chỉ phải viết code xử lý một lần cho toàn bộ dự án
// Cách sử dụng: Với tất cả các link hoặc button mà có hành động call api thì thêm class "tqd-send" cho nó là xong.
const updateSendingApiStatus = (sending = true) => {
  const submits = document.querySelectorAll('.tqd-send')
  for (let i = 0; i < submits.length; i++) {
    if (sending) submits[i].classList.add('tqd-waiting')
    else submits[i].classList.remove('tqd-waiting')
  }
}


//https://axios-http.com/docs/interceptors

// can thiệp vào giữa những request gửi đi
authorizedAxiosInstance.interceptors.request.use(function (config) {
  // Do something before request is sent
  updateSendingApiStatus(true)
  // Nếu như không sử dụng .defaults.withCredentials như trên với cookie mà muốn dùng localstorage để lấy token gửi lên cho BE thì lấy và đính kèm đây:
  // ...
  return config
}, function (error) {
  // Do something with request error
  return Promise.reject(error)
})

// Khởi tạo một cái promise cho việc gọi api refresh_token
// Mục đích tạo Promise này để khi nào gọi api refresh_token xong xuôi thì mới retry lại các api bị lỗi trước đó.
let refreshTokenPromise = null

// // can thiệp vào giữa những response trả về
authorizedAxiosInstance.interceptors.response.use(function (response) {
  // Any status code that lie within the range of 2xx cause this function to trigger
  // Do something with response data
  updateSendingApiStatus(false)

  return response
}, function (error) {
  // Any status codes that falls outside the range of 2xx cause this function to trigger
  // Do something with response error
  updateSendingApiStatus(false)
  // Trường hợp 1: Nếu như nhận mã 401 từ BE thì gọi API đăng xuất
  if (error.response?.status === 401) {
    store.dispatch(signOutUserAPI(false))
  }
  // Trường hợp 2: Nêú như nhân mã 410 từ BE, thì sẽ gọi API refs token đẻ làm mới accessToken
  // console.log(error.config)
  const originalRequests = error.config

  if (error.response?.status === 410 && !originalRequests._retry) {
    originalRequests._retry = true
    // Kiểm tra xem nếu chưa có refreshTokenPromise thì thực hiện gán việc gọi api refresh_token vào cho cái refreshTokenPromise này
    if (!refreshTokenPromise) {
      refreshTokenPromise = refreshTokenAPI()
        .then(data => { return data?.accessToken }) // đồng thời accessToken đã nằm trong httpOnly cookie (xử lý từ phía BE)
        .catch(() => { store.dispatch(signOutUserAPI(false)) }) // Nếu nhận bất kì lỗi nào từ API refresh Token thì cứ logout luôn
        .finally(() => { refreshTokenPromise = null }) //Xong xuôi hết thỉ gán lại cái  refresh Token về null như ban đầu
    }
    return refreshTokenPromise
    // eslint-disable-next-line
      .then(accessToken => {
        // Hiện tại ở đây không cần dùng gì tới accessToken vì chúng ta đã đưa nó vào cookie (xử lý từ phía BE) khi api được gọi thành công.
        // Trường hợp nếu dự án cần lưu accessToken vào localstorage hoặc đâu đó thì sẽ viết thêm code ở đây.
        // Gán accessToken lại vào trong localStorage

        // Quan trọng: Return lại axios instance của chúng ta kết hợp các originalRequests để call lại những api ban đầu bị lỗi
        // return authorizedAxiosInstance(originalRequests)
        if (accessToken) {
          return authorizedAxiosInstance(originalRequests)
        }
      })
  }


  let errorMessage = error?.message
  if (error.response?.data?.errors) {
    errorMessage = error.response?.data?.errors
  }
  if (error.response?.status !== 410) {
    toast.error(errorMessage, { theme:'colored' })
  }


  return Promise.reject(error)
})
export default authorizedAxiosInstance