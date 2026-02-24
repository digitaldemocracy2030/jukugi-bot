# Design System Guide

## Rules

- Always import UI components from **`components/design-system/`**
- Do not use `components/ui/` (shadcn/ui primitives) directly
- Build pages (`routes/`) and feature components (`room/`, `admin/`) by composing design-system components

## Import

```tsx
import {
  Button,
  Input,
  Typography,
  Stack,
  Modal,
  VideoTile,
  DataTable,
} from "~/components/design-system";
```

## Components

| Category | Path | Components |
|----------|------|------------|
| Foundations | `foundations/` | Typography, Icon, Spinner, Divider |
| Forms | `forms/` | Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Toggle, FormField |
| Data Display | `data-display/` | Badge, StatusIndicator, Avatar, AvatarGroup, Timer, Countdown, EmptyState |
| Layout | `layout/` | Stack, Container, Toolbar, ToolbarSection, Sidebar, SplitPane |
| Feedback | `feedback/` | Toast (useToast), Alert, Tooltip, Progress, Skeleton |
| Overlay | `overlay/` | Modal, ConfirmDialog, DropdownMenu, Popover |
| Navigation | `navigation/` | Tabs, Breadcrumb |
| Meeting | `meeting/` | VideoTile, VideoGrid, MediaControlBar, SpeakerIndicator, ParticipantList, ParticipantListItem, SpeakerTimer, HandRaiseButton, ReactionBar, TransitionVotePanel |
| Admin | `admin/` | DataTable, FormSection, PageHeader, StatCard |

## Common Patterns

### variant / size

Most components accept `variant` and `size` props:

```tsx
<Button variant="primary" size="md">Join</Button>
<Badge colorScheme="success" variant="subtle">Active</Badge>
<Avatar name="Taro Tanaka" size="lg" status="speaking" />
```

### HTML Attribute Pass-Through

Button, Input, Textarea etc. accept all native HTML element attributes:

```tsx
<Button onClick={handleClick} disabled={loading} type="submit">
  Submit
</Button>
<Input placeholder="Name" onChange={handleChange} autoFocus />
```

### Ref Forwarding

All components support `ref`:

```tsx
const buttonRef = useRef<HTMLButtonElement>(null);
<Button ref={buttonRef}>Click</Button>
```

### className

All components accept `className` for Tailwind overrides:

```tsx
<Stack direction="horizontal" gap={4} className="mt-8">
```

## Usage Examples

### Form

```tsx
<FormField label="Room title" required error={errors.title}>
  <Input placeholder="Enter title" error={!!errors.title} />
</FormField>
```

### Confirm Dialog

```tsx
<ConfirmDialog
  open={showDelete}
  onOpenChange={setShowDelete}
  title="Delete this item?"
  description="This action cannot be undone."
  confirmVariant="destructive"
  onConfirm={handleDelete}
/>
```

### Admin Page Header

```tsx
<PageHeader
  title="Room Management"
  breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Rooms" }]}
  actions={<Button variant="primary">Create New</Button>}
/>
```

### Meeting Layout

```tsx
<SplitPane aside={<ParticipantList ... />} asideOpen={showSidebar}>
  <VideoGrid layout="spotlight" spotlightContent={<VideoTile ... />}>
    {participants.map(p => <VideoTile key={p.id} ... />)}
  </VideoGrid>
  <MediaControlBar
    micEnabled={mic} onMicToggle={toggleMic}
    cameraEnabled={cam} onCameraToggle={toggleCam}
    onLeave={leave}
  />
</SplitPane>
```

## Notes

- Meeting components do not depend on LiveKit. LiveKit integration happens in `components/room/`
- Do not edit `components/ui/` directly (managed by shadcn/ui)
- Run Biome check after modifying any design-system component
