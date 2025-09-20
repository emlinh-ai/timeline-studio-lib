# CapCut Timeline Example

Đây là một ví dụ hoàn chỉnh về cách sử dụng `timeline-studio-lib` để tạo ra một giao diện timeline giống CapCut với đầy đủ tính năng tương tác.

## 🚀 Tính năng

### Giao diện Timeline
- ✅ Giao diện dark theme giống CapCut
- ✅ Hiển thị multiple tracks (video, audio, text, overlay)
- ✅ Drag & drop clips trên timeline
- ✅ Zoom in/out timeline
- ✅ Scroll timeline theo thời gian

### Player Controls
- ✅ Play/Pause/Stop controls
- ✅ Seek backward/forward (±5s)
- ✅ Time display với format MM:SS
- ✅ Mute/Unmute audio
- ✅ Playhead hiển thị vị trí hiện tại

### Event System
- ✅ EventBus tích hợp để giao tiếp giữa components
- ✅ Real-time event logging
- ✅ Các events cơ bản:
  - `timeline:clipClick` - Click vào clip
  - `timeline:scroll` - Scroll timeline
  - `timeline:zoom` - Zoom timeline
  - `timeline:stateChange` - Thay đổi trạng thái
  - Custom events cho player controls

### Playhead
- ✅ Playhead đỏ hiển thị vị trí hiện tại
- ✅ Time tooltip khi hover
- ✅ Đồng bộ với player controls
- ✅ Auto-update khi playing

## 🛠️ Cài đặt và Chạy

### Prerequisites
- Node.js >= 16
- npm hoặc yarn

### Cài đặt dependencies
```bash
cd examples/capcut-timeline-example
npm install
```

### Chạy development server
```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

### Build production
```bash
npm run build
```

## 📁 Cấu trúc Project

```
capcut-timeline-example/
├── src/
│   ├── components/
│   │   └── Playhead.tsx          # Component playhead tùy chỉnh
│   ├── App.tsx                   # Component chính
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🎯 Cách sử dụng EventBus

### 1. Wrap ứng dụng với EventBusProvider
```tsx
import { EventBusProvider } from 'timeline-studio-lib';

<EventBusProvider namespace="capcut-example" debugMode={true}>
  <App />
</EventBusProvider>
```

### 2. Sử dụng EventBus trong component
```tsx
import { useEventBus } from 'timeline-studio-lib';

const MyComponent = () => {
  const eventBus = useEventBus();

  // Lắng nghe events
  useEffect(() => {
    const unsubscribe = eventBus.on('timeline:clipClick', (payload) => {
      console.log('Clip clicked:', payload);
    });
    
    return unsubscribe;
  }, [eventBus]);

  // Emit events
  const handleSeek = (time: number) => {
    eventBus.emit('timeline:scrollTo', { time });
  };
};
```

### 3. Các Events có sẵn

#### Timeline Events (tự động emit)
- `timeline:clipClick` - Khi click vào clip
- `timeline:scroll` - Khi scroll timeline
- `timeline:zoom` - Khi zoom timeline
- `timeline:stateChange` - Khi state thay đổi

#### Command Events (có thể emit để điều khiển)
- `timeline:scrollTo` - Scroll đến thời gian cụ thể
- `timeline:setZoom` - Set zoom level
- `timeline:addClip` - Thêm clip mới
- `timeline:removeClip` - Xóa clip
- `timeline:updateClip` - Cập nhật clip

## 🎨 Tùy chỉnh Giao diện

### CSS Variables
Bạn có thể tùy chỉnh màu sắc và style thông qua CSS variables:

```css
:root {
  --timeline-bg: #1a1a1a;
  --track-bg: #222;
  --clip-video: #4CAF50;
  --clip-audio: #2196F3;
  --playhead-color: #ff4444;
}
```

### Custom Clip Renderer
```tsx
import { ClipRenderer } from 'timeline-studio-lib';

const CustomClip = (props) => (
  <ClipRenderer {...props}>
    {/* Custom clip content */}
  </ClipRenderer>
);

<Timeline renderClip={CustomClip} />
```

## 📊 Event Logging

Ứng dụng có tích hợp event logging ở góc phải màn hình để bạn có thể:
- Theo dõi các events được emit
- Debug tương tác người dùng
- Hiểu cách EventBus hoạt động

## 🔧 Mở rộng

### Thêm Custom Events
```tsx
// Define custom event types
interface CustomEvents {
  'player:volumeChange': { volume: number };
  'timeline:trackMute': { trackId: string; muted: boolean };
}

// Emit custom events
eventBus.emit('player:volumeChange', { volume: 0.5 });

// Listen to custom events
eventBus.on('player:volumeChange', (payload) => {
  console.log('Volume changed:', payload.volume);
});
```

### Tích hợp với Video Player
```tsx
const VideoPlayer = () => {
  const eventBus = useEventBus();
  
  useEffect(() => {
    // Sync video player với timeline
    const unsubscribe = eventBus.on('timeline:scrollTo', ({ time }) => {
      videoRef.current.currentTime = time;
    });
    
    return unsubscribe;
  }, []);
};
```

## 📚 Tài liệu tham khảo

- [Timeline Studio Lib Documentation](../../README.md)
- [EventBus API Reference](../../docs/EventBus.md)
- [Custom Clip Renderer Guide](../../docs/CustomClipRenderer.md)

## 🐛 Troubleshooting

### Timeline không hiển thị
- Kiểm tra `tracks` data có đúng format không
- Đảm bảo `duration` > 0
- Kiểm tra CSS styles có conflict không

### Events không hoạt động
- Kiểm tra `EventBusProvider` đã wrap đúng chưa
- Đảm bảo `namespace` consistent
- Bật `debugMode={true}` để xem logs

### Performance issues
- Bật `enableVirtualization={true}`
- Giảm số lượng clips trong tracks
- Optimize custom clip renderers

## 🤝 Đóng góp

Nếu bạn tìm thấy bugs hoặc có ý tưởng cải thiện, hãy tạo issue hoặc pull request!

## 📄 License

MIT License - xem file [LICENSE](../../LICENSE) để biết thêm chi tiết.