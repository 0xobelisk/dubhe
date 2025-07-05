# Dubhe UI Components Guide

## 🎨 Overview

Dubhe UI is a comprehensive component library built with React, TypeScript, and Tailwind CSS. All
components are designed with accessibility in mind and follow modern design patterns.

## 📦 Available Components

### Form Components

#### Button

```tsx
import { Button } from '@workspace/ui/components/button'

// Basic usage
<Button>Click me</Button>

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>
```

#### Input

```tsx
import { Input } from '@workspace/ui/components/input'

// Basic usage
<Input placeholder="Enter text" />

// Types
<Input type="email" placeholder="Enter email" />
<Input type="password" placeholder="Enter password" />
<Input type="number" placeholder="Enter number" />

// States
<Input disabled placeholder="Disabled input" />
<Input value="Read only" readOnly />
```

#### Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>;
```

### Layout Components

#### Card

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@workspace/ui/components/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>;
```

#### Table

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
  </TableBody>
</Table>;
```

### Feedback Components

#### Alert

```tsx
import { Alert, AlertTitle, AlertDescription } from '@workspace/ui/components/alert'

<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>
```

#### Badge

```tsx
import { Badge } from '@workspace/ui/components/badge'

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

#### Toast

```tsx
import {
  Toast,
  ToastAction,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@workspace/ui/components/toast';

<ToastProvider>
  <Toast>
    <ToastTitle>Scheduled: Catch up</ToastTitle>
    <ToastDescription>Friday, February 10, 2023 at 3:00 PM</ToastDescription>
    <ToastAction altText="Try again">Try again</ToastAction>
  </Toast>
  <ToastViewport />
</ToastProvider>;
```

#### Progress

```tsx
import { Progress } from '@workspace/ui/components/progress'

<Progress value={33} />
<Progress value={66} className="w-[60%]" />
```

### Navigation Components

#### Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';

<Tabs defaultValue="account" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">Account settings form</TabsContent>
  <TabsContent value="password">Password change form</TabsContent>
</Tabs>;
```

### Overlay Components

#### Modal

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/modal';

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>This action cannot be undone.</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>;
```

## 🎨 Styling

### Custom Classes

All components accept a `className` prop for custom styling:

```tsx
<Button className="bg-blue-500 hover:bg-blue-600">Custom Button</Button>
```

### Variants

Many components support different variants:

```tsx
// Button variants
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>

// Badge variants
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
```

### Sizes

Some components support different sizes:

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

## ♿ Accessibility

All components are built with accessibility in mind:

- **Keyboard Navigation**: All interactive components support keyboard navigation
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Color Contrast**: Meets WCAG 2.1 AA standards

### Best Practices

```tsx
// Always provide labels for form inputs
<Input aria-label="Email address" placeholder="Enter email" />

// Use semantic HTML
<Button aria-label="Delete item">Delete</Button>

// Provide alt text for images
<img src="avatar.jpg" alt="User avatar" />
```

## 🔧 Advanced Usage

### Composition

Components are designed to be composable:

```tsx
<Card>
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <Input id="name" />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <Input id="email" type="email" />
      </div>
    </div>
  </CardContent>
  <CardFooter>
    <Button>Save Changes</Button>
  </CardFooter>
</Card>
```

### Custom Components

You can build custom components using the base components:

```tsx
interface UserCardProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

function UserCard({ user }: UserCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge>{user.role}</Badge>
      </CardContent>
    </Card>
  );
}
```

## 🚀 性能

### Lazy Loading

For better performance, consider lazy loading components:

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Memoization

Use React.memo for components that don't need frequent re-renders:

```tsx
const UserCard = React.memo(function UserCard({ user }) {
  return (
    <Card>
      <CardTitle>{user.name}</CardTitle>
    </Card>
  );
});
```

## 🧪 测试

### Component 测试

All components include comprehensive tests:

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@workspace/ui/components/button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
});
```

### Integration 测试

Test component interactions:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, DialogTrigger } from '@workspace/ui/components/modal';

test('opens dialog on trigger click', () => {
  render(
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
    </Dialog>
  );

  fireEvent.click(screen.getByText('Open'));
  // Test dialog state
});
```

## 📚 Additional Resources

- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## 🤝 贡献

When adding new components:

1. Follow the existing component patterns
2. Include comprehensive tests
3. Add proper TypeScript types
4. Ensure accessibility compliance
5. Update this documentation

## 📄 License

This component library is part of the Dubhe project and is licensed under the MIT License.
