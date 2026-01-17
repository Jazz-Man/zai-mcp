# Effect TS @effect/ai - MCP Server Documentation (Оновлена версія 2.0)

## Огляд

`@effect/ai` - це бібліотека для створення MCP (Model Context Protocol) серверів з використанням Effect TypeScript. Ця документація базується на **прямому аналізі сорс-кодів** `@effect/ai` та `@effect/platform-bun` (версія 0.33.2).

**Ключові архітектурні рішення:**
- **Effect-based**: Все побудовано на Effect系统中 для керування side effects
- **Layer Composition**: Використання Layer для dependency injection
- **Type Safety**: Повна типізація tools, resources, prompts
- **RPC-based**: Використання `@effect/rpc` для комунікації

**Важливі уточнення після аналізу сорс-кодів:**
- `BunStream` та `BunSink` - це реекспорти з `@effect/platform-node-shared`
- `McpServerClient` - це Context.Tag, що надає RPC клієнт
- `McpServer.elicit` - функція, що вимагає McpServerClient в контексті
- Правильний порядок Layer composition критичний для роботи

## Основні компоненти

### McpServer (Context Tag)

`McpServer` є Context.Tag, який надає сервіс для управління MCP сервером.

```typescript
export class McpServer extends Context.Tag("@effect/ai/McpServer")<
  McpServer,
  {
    readonly notifications: RpcClient.RpcClient<RpcGroup.Rpcs<typeof ServerNotificationRpcs>>
    readonly notificationsMailbox: Mailbox.ReadonlyMailbox<RpcMessage.Request<any>>
    readonly initializedClients: Set<number>
    
    readonly tools: ReadonlyArray<Tool>
    readonly addTool: (options: {
      readonly tool: Tool
      readonly handle: (payload: any) => Effect.Effect<CallToolResult, never, McpServerClient>
    }) => Effect.Effect<void>
    
    readonly resources: ReadonlyArray<Resource>
    readonly addResource: (
      resource: Resource,
      handle: Effect.Effect<typeof ReadResourceResult.Type, InternalError, McpServerClient>
    ) => Effect.Effect<void>
    
    readonly resourceTemplates: ReadonlyArray<ResourceTemplate>
    readonly prompts: ReadonlyArray<Prompt>
    // ... інші методи
  }
>() {}
```

### McpServerClient (Context Tag)

**ВАЖЛИВО:** `McpServerClient` - це Context Tag, а не об'єкт з методами. Він надає доступ до RPC клієнта для комунікації з MCP клієнтом.

```typescript
export class McpServerClient extends Context.Tag("@effect/ai/McpSchema/McpServerClient")<
  McpServerClient,
  {
    readonly clientId: number
    readonly getClient: Effect.Effect<
      RpcClient.RpcClient<RpcGroup.Rpcs<typeof ServerRequestRpcs>, RpcClientError>,
      never,
      Scope.Scope
    >
  }
>() {}
```

## Transport Implementations

### 1. Stdio Transport (для Bun)

Використовується для запуску MCP сервера через stdio (стандартний ввід/вивід).

```typescript
import { McpServer, Tool, Toolkit } from "@effect/ai";
import { BunRuntime, BunSink, BunStream } from "@effect/platform-bun";
import { Effect, Layer, Logger, Schema } from "effect";

// Створення простого tool
const GetTimezoneTool = Tool.make("get_timezone", {
  description: "Get the current timezone information",
  parameters: {},
  success: Schema.Struct({
    timezone: Schema.String,
    offset: Schema.Number,
  }),
});

// Handler для tool
const GetTimezoneHandler = (_params: unknown) =>
  Effect.succeed({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: new Date().getTimezoneOffset(),
  });

// Створення toolkit
const TimezoneToolkit = Toolkit.make(GetTimezoneTool);

// Створення handlers layer
const TimezoneHandlers = TimezoneToolkit.toLayer(
  Effect.succeed({
    get_timezone: GetTimezoneHandler,
  })
);

// Створення server layer
const ServerLayer = Layer.mergeAll(
  McpServer.toolkit(TimezoneToolkit)
).pipe(
  Layer.provide(TimezoneHandlers),
  Layer.provide(
    McpServer.layerStdio({
      name: "Timezone Server",
      version: "1.0.0",
      stdin: BunStream.stdin,
      stdout: BunSink.stdout,
    })
  ),
  Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true })))
);

// Запуск сервера
Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
```

**Сигнатура `layerStdio`:**
```typescript
export const layerStdio: <EIn, RIn, EOut, ROut>(options: {
  readonly name: string
  readonly version: string
  readonly stdin: Stream<Uint8Array, EIn, RIn>
  readonly stdout: Sink<unknown, Uint8Array | string, unknown, EOut, ROut>
}) => Layer.Layer<McpServer | McpServerClient, never, RIn | ROut>
```

### 2. HTTP Transport

Для HTTP транспорту (Node.js або Bun HTTP сервер):

```typescript
import { McpServer, Tool, Toolkit } from "@effect/ai";
import { HttpRouter } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";

const EchoTool = Tool.make("echo", {
  description: "Echo the input message",
  parameters: {
    message: Schema.String,
  },
  success: Schema.Struct({
    echo: Schema.String,
  }),
});

const EchoHandler = (params: { message: string }) =>
  Effect.succeed({ echo: params.message });

const EchoToolkit = Toolkit.make(EchoTool);
const EchoHandlers = EchoToolkit.toLayer(
  Effect.succeed({ echo: EchoHandler })
);

const ServerLayer = Layer.mergeAll(
  McpServer.toolkit(EchoToolkit),
  HttpRouter.Default.serve()
).pipe(
  Layer.provide(EchoHandlers),
  Layer.provide(
    McpServer.layerHttp({
      name: "Echo Server",
      version: "1.0.0",
      path: "/mcp",
    })
  ),
  Layer.provide(BunHttpServer.layer({ port: 3000 }))
);

Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
```

**Сигнатура `layerHttp`:**
```typescript
export const layerHttp: <I = HttpRouter.Default>(options: {
  readonly name: string
  readonly version: string
  readonly path: HttpRouter.PathInput
  readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
}) => Layer.Layer<McpServer | McpServerClient>
```

## Resources

### Створення статичного ресурсу

```typescript
import { McpServer } from "@effect/ai";
import { Effect, Layer, Schema } from "effect";

const ConfigResource = McpServer.resource({
  uri: "config://app",
  name: "Application Config",
  description: "Current application configuration",
  mimeType: "application/json",
  content: Effect.succeed({
    version: "1.0.0",
    environment: "production",
  }),
});

const ServerLayer = Layer.mergeAll(ConfigResource).pipe(
  Layer.provide(
    McpServer.layerStdio({
      name: "Config Server",
      version: "1.0.0",
      stdin: BunStream.stdin,
      stdout: BunSink.stdout,
    })
  )
);
```

### Створення ресурсного шаблону з параметрами

**ВАЖЛИВО:** Використовуйте `McpSchema.param` для створення параметрів:

```typescript
import { McpSchema, McpServer } from "@effect/ai";
import { Effect, Schema } from "effect";

// Створення параметра
const userIdParam = McpSchema.param("userId", Schema.NumberFromString);

// Створення ресурсного шаблону
const UserResource = McpServer.resource`user://profile/${userIdParam}`({
  name: "User Profile",
  description: "Get user profile by ID",
  // Auto-completion для параметра userId
  completion: {
    userId: (_input: string) => Effect.succeed([1, 2, 3, 42, 100]),
  },
  content: Effect.fn(function* (_uri, userId) {
    // Тут userId вже декодований як number
    const userData = yield* fetchUserData(userId);
    return JSON.stringify(userData);
  }),
});

const fetchUserData = (id: number) =>
  Effect.succeed({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
  });
```

**Підтримувані типи контенту:**
- `string` - текстовий контент
- `Uint8Array` - бінарний контент
- `ReadResourceResult` - структурований результат з метаданими

## Prompts

### Створення prompt з параметрами

```typescript
import { McpServer } from "@effect/ai";
import { Effect, Schema } from "effect";

const AnalyzePrompt = McpServer.prompt({
  name: "analyze_data",
  description: "Generate analysis prompt for specific data type",
  parameters: Schema.Struct({
    dataType: Schema.Literal("sales", "users", "logs"),
    timeRange: Schema.String,
    includeCharts: Schema.optional(Schema.Boolean),
  }),
  // Auto-completion для параметрів
  completion: {
    dataType: (_input: string) =>
      Effect.succeed(["sales", "users", "logs"]),
    timeRange: (_input: string) =>
      Effect.succeed(["today", "this_week", "this_month", "this_year"]),
  },
  content: ({ dataType, timeRange, includeCharts }) =>
    Effect.succeed(
      `Analyze ${dataType} data for ${timeRange}.${
        includeCharts ? " Include visualization charts." : ""
      }`
    ),
});
```

**Prompt може повертати:**
- `string` - простий текст
- `Array<PromptMessage>` - масив structured messages з ролями

```typescript
// Приклад з structured messages
content: (params) =>
  Effect.succeed([
    {
      role: "user",
      content: {
        type: "text",
        text: `Analyze the data: ${params.dataType}`,
      },
    },
  ]);
```

## Tools Management

### Створення простого tool

```typescript
import { Tool } from "@effect/ai";
import { Schema } from "effect";

const CalculatorTool = Tool.make("calculator", {
  description: "Perform basic arithmetic operations",
  parameters: {
    operation: Schema.Literal("add", "subtract", "multiply", "divide"),
    a: Schema.Number,
    b: Schema.Number,
  },
  success: Schema.Struct({
    result: Schema.Number,
  }),
});
```

### Tool з анотаціями

```typescript
const ReadOnlyTool = Tool.make("get_data", {
  description: "Fetch read-only data",
  parameters: {},
  success: Schema.String,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);
```

### Tool з failure mode

```typescript
const SafeTool = Tool.make("safe_operation", {
  description: "An operation that captures errors",
  parameters: {},
  success: Schema.Struct({
    success: Schema.Boolean,
    data: Schema.optional(Schema.Unknown),
    error: Schema.optional(Schema.String),
  }),
  failureMode: "return", // Errors повертаються як результат
});
```

### Реєстрація toolkit

```typescript
import { Toolkit } from "@effect/ai";

const MyToolkit = Toolkit.make(Tool1, Tool2, Tool3);

// Створення handlers
const MyHandlers = MyToolkit.toLayer(
  Effect.succeed({
    tool1_name: tool1Handler,
    tool2_name: tool2Handler,
    tool3_name: tool3Handler,
  })
);

// Додавання до сервера
const ServerLayer = Layer.mergeAll(
  McpServer.toolkit(MyToolkit)
).pipe(
  Layer.provide(MyHandlers),
  Layer.provide(McpServer.layerStdio({ /* ... */ }))
);
```

## Elicitation (Запит даних від користувача)

### ВАЖЛИВО: Правильне використання elicit

`McpServer.elicit` вимагає `McpServerClient` в контексті. Для використання в tool handlers:

**Крок 1:** Додайте `McpServerClient` як залежність до tool:

```typescript
import { McpServer, Tool } from "@effect/ai";
import { McpServerClient } from "@effect/ai/McpSchema";
import { Effect, Schema } from "effect";

const UserDataSchema = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  age: Schema.Number,
});

// ВАЖЛИВО: Додаємо McpServerClient як залежність
const GetUserDataTool = Tool.make("get_user_data", {
  description: "Collect user data through elicitation",
  parameters: {},
  success: UserDataSchema,
}).addDependency(McpServerClient);
```

**Крок 2:** Використовуйте elicit в handler:

```typescript
const GetUserDataHandler = (_params: unknown) =>
  Effect.gen(function* () {
    // elicit вимагає McpServerClient в контексті
    const userData = yield* McpServer.elicit({
      message: "Please provide your personal information",
      schema: UserDataSchema,
    }).pipe(
      // Обробка помилки відмови користувача
      Effect.catchTag("ElicitationDeclined", (error) =>
        Effect.die(
          new Error(`User declined: ${error.message || "No reason provided"}`)
        )
      )
    );

    return userData;
  });
```

**Крок 3:** Створення toolkit та handlers:

```typescript
const UserDataToolkit = Toolkit.make(GetUserDataTool);

const UserDataHandlers = UserDataToolkit.toLayer(
  Effect.succeed({
    get_user_data: GetUserDataHandler,
  })
);

const ServerLayer = Layer.mergeAll(
  McpServer.toolkit(UserDataToolkit)
).pipe(
  Layer.provide(UserDataHandlers),
  // layerStdio надає McpServerClient
  Layer.provide(
    McpServer.layerStdio({
      name: "User Data Server",
      version: "1.0.0",
      stdin: BunStream.stdin,
      stdout: BunSink.stdout,
    })
  )
);
```

### ElicitationDeclined Error

```typescript
class ElicitationDeclined extends Schema.TaggedError<ElicitationDeclined>()(
  "ElicitationDeclined",
  {
    cause: Schema.optional(Schema.Defect),
    request: Elicit.payloadSchema,
  }
) {}
```

**Можливі результати elicitation:**
- `"accept"` - користувач надав дані
- `"cancel"` - користувач скасував (Effect.interrupt)
- `"decline"` - користувач відмовився (ElicitationDeclined error)

## Bun-Specific Considerations

### BunRuntime

```typescript
import { BunRuntime } from "@effect/platform-bun";

// BunRuntime.runMain - використовується для запуску Effect програм
Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
```

### BunStream and BunSink

```typescript
import { BunStream, BunSink } from "@effect/platform-bun";

// BunStream.stdin - stream для читання з stdin
// BunSink.stdout - sink для запису в stdout
// BunSink.stderr - sink для запису в stderr

McpServer.layerStdio({
  name: "My Server",
  version: "1.0.0",
  stdin: BunStream.stdin,
  stdout: BunSink.stdout,
});
```

**Примітка:** `@effect/platform-bun` реекспортує багато функцій з `@effect/platform-node-shared`, тому вони працюють ідентично.

## Архітектура Layer Composition

### Правильний порядок layers

```typescript
const ServerLayer = Layer.mergeAll(
  // 1. Реєстрація resources, prompts, toolkits
  ResourceLayer,
  PromptLayer,
  McpServer.toolkit(Toolkit1),
  McpServer.toolkit(Toolkit2),
).pipe(
  // 2. Надання handlers (якщо потрібні)
  Layer.provide(HandlersLayer),
  
  // 3. Надання McpServer implementation (це надає McpServerClient)
  Layer.provide(
    McpServer.layerStdio({ /* ... */ })
    // або McpServer.layerHttp({ /* ... */ })
  ),
  
  // 4. Додаткові layers (logging, тощо)
  Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true }))),
);
```

### Чому порядок важливий

1. **McpServer.toolkit()** повертає Layer, який вимагає `McpServer` та handlers
2. **Handlers** можуть вимагати `McpServerClient` (для elicit)
3. **layerStdio/layerHttp** надають і `McpServer`, і `McpServerClient`
4. Layers надаються знизу вгору через `Layer.provide`

## Типові помилки та їх вирішення

### Помилка 1: Handler вимагає McpServerClient

**Проблема:**
```typescript
// ❌ НЕПРАВИЛЬНО - handler не може використовувати McpServer.elicit
const MyHandler = () => McpServer.elicit({ /* ... */ });
```

**Рішення:**
```typescript
// ✅ ПРАВИЛЬНО - додаємо McpServerClient як залежність
const MyTool = Tool.make("my_tool", { /* ... */ })
  .addDependency(McpServerClient);
```

### Помилка 2: Неправильний порядок layers

**Проблема:**
```typescript
// ❌ НЕПРАВИЛЬНО - layerStdio має бути наданий до handlers
Layer.mergeAll(
  McpServer.layerStdio({ /* ... */ })
).pipe(
  Layer.provide(HandlersLayer) // HandlersLayer не може знайти McpServerClient
);
```

**Рішення:**
```typescript
// ✅ ПРАВИЛЬНО
Layer.mergeAll(
  McpServer.toolkit(Toolkit)
).pipe(
  Layer.provide(HandlersLayer),
  Layer.provide(McpServer.layerStdio({ /* ... */ }))
);
```

### Помилка 3: Спроба викликати методи на McpServerClient

**Проблема:**
```typescript
// ❌ НЕПРАВИЛЬНО - McpServerClient не має методу elicit
const client = yield* McpServerClient;
client.elicit({ /* ... */ }); // Помилка!
```

**Рішення:**
```typescript
// ✅ ПРАВИЛЬНО - використовуйте McpServer.elicit
const data = yield* McpServer.elicit({ /* ... */ });
```

## Повний приклад MCP сервера для Bun

```typescript
import { McpSchema, McpServer, Tool, Toolkit } from "@effect/ai";
import { McpServerClient } from "@effect/ai/McpSchema";
import { BunRuntime, BunSink, BunStream } from "@effect/platform-bun";
import { Effect, Layer, Logger, Schema } from "effect";

// 1. Створення ресурсу з параметрами
const fileIdParam = McpSchema.param("id", Schema.NumberFromString);

const FileResource = McpServer.resource`file://document/${fileIdParam}`({
  name: "Document File",
  description: "Access document by ID",
  completion: {
    id: (_) => Effect.succeed([1, 2, 3, 4, 5]),
  },
  content: Effect.fn(function* (_uri, id) {
    return `Document #${id} content here...`;
  }),
});

// 2. Створення prompt
const SummarizePrompt = McpServer.prompt({
  name: "summarize",
  description: "Generate a summary prompt",
  parameters: Schema.Struct({
    length: Schema.Literal("short", "medium", "long"),
  }),
  completion: {
    length: (_) => Effect.succeed(["short", "medium", "long"]),
  },
  content: ({ length }) =>
    Effect.succeed(`Summarize the following content in ${length} format.`),
});

// 3. Створення tool з elicitation
const UserPreferencesSchema = Schema.Struct({
  theme: Schema.Literal("light", "dark"),
  language: Schema.Literal("en", "uk", "de"),
});

const GetPreferencesTool = Tool.make("get_preferences", {
  description: "Get user preferences through elicitation",
  parameters: {},
  success: UserPreferencesSchema,
}).addDependency(McpServerClient);

const GetPreferencesHandler = (_params: unknown) =>
  Effect.gen(function* () {
    const prefs = yield* McpServer.elicit({
      message: "Please select your preferences",
      schema: UserPreferencesSchema,
    }).pipe(
      Effect.catchTag("ElicitationDeclined", (_error) =>
        Effect.succeed({ theme: "light" as const, language: "en" as const })
      )
    );

    return prefs;
  });

// 4. Створення toolkit та handlers
const PreferencesToolkit = Toolkit.make(GetPreferencesTool);

const PreferencesHandlers = PreferencesToolkit.toLayer(
  Effect.succeed({
    get_preferences: GetPreferencesHandler,
  })
);

// 5. Складання server layer
const ServerLayer = Layer.mergeAll(
  FileResource,
  SummarizePrompt,
  McpServer.toolkit(PreferencesToolkit)
).pipe(
  Layer.provide(PreferencesHandlers),
  Layer.provide(
    McpServer.layerStdio({
      name: "Complete Demo Server",
      version: "1.0.0",
      stdin: BunStream.stdin,
      stdout: BunSink.stdout,
    })
  ),
  Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true })))
);

// 6. Запуск
Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
```

## Додаткові можливості

### Roots Support

Сервер може повідомляти клієнта про зміни в кореневих директоріях:

```typescript
// Отримання сервісу для відправки нотифікацій
const server = yield* McpServer;

// Відправка нотифікації про зміни
yield* server.notifications["notifications/roots/list_changed"]({});
```

### Progress Notifications

```typescript
yield* server.notifications["notifications/progress"]({
  progressToken: "task-123",
  progress: 50,
  total: 100,
});
```

### Resource Updates

```typescript
yield* server.notifications["notifications/resources/updated"]({
  uri: "file://document/1",
});
```

## Резюме ключових відмінностей

1. **McpServerClient** - Context Tag, не об'єкт з методами
2. **McpServer.elicit** - функція, яка вимагає McpServerClient в контексті
3. **Tool.addDependency()** - метод для оголошення залежностей tool
4. **Layer composition order** - критично важливий для правильної роботи
5. **BunStream/BunSink** - реекспорти з @effect/platform-node-shared

## Корисні посилання

- [Effect Documentation](https://effect.website/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Effect AI GitHub](https://github.com/Effect-TS/effect)
