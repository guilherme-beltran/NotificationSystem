using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Text.Json.Serialization;

namespace NotificationSystem.Hubs;

public interface INotificationClient
{
    Task ReceiveMessage(string type, string message, int fromUserId);
}

public record User
{
    [JsonPropertyName("id")]
    public int Id { get; set; }
    [JsonPropertyName("name")]
    public string Name { get; set; }
    public string ConnectionId { get; set; } = string.Empty;
}

public sealed class NotificationHub : Hub<INotificationClient>
{
    private static readonly ConcurrentDictionary<int, User> Users = new();
    private static readonly ConcurrentDictionary<int, List<(string type, string message, int fromUserId)>> PendingMessages = new();

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var authHeader = httpContext?.Request.Headers.Authorization.ToString();

        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
        {
            var userJson = authHeader.Substring("Bearer ".Length).Trim();
            try
            {
                var user = System.Text.Json.JsonSerializer.Deserialize<User>(userJson);
                if (user != null)
                {
                    user.ConnectionId = Context.ConnectionId;
                    Users[user.Id] = user;
                    Console.WriteLine($"Usuário conectado: {user.Name} (ID: {user.Id})");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao desserializar Authorization: {ex.Message}");
            }
        }
        else if (httpContext != null && httpContext.Request.Query.TryGetValue("access_token", out var value))
        {
            var userHeader = value.ToString();
            if (!string.IsNullOrWhiteSpace(userHeader))
            {
                try
                {
                    var user = System.Text.Json.JsonSerializer.Deserialize<User>(userHeader!);
                    if (user != null)
                    {
                        user.ConnectionId = Context.ConnectionId;
                        Users[user.Id] = user;
                        Console.WriteLine($"Usuário conectado: {user.Name} (ID: {user.Id})");

                        // Se há mensagens pendentes, enviar agora
                        if (PendingMessages.TryRemove(user.Id, out var pending))
                        {
                            foreach (var (type, message, fromUserId) in pending)
                            {
                                await Clients.Client(user.ConnectionId)
                                    .ReceiveMessage(type, message, fromUserId);
                                Console.WriteLine($"Mensagem pendente enviada a {user.Id}");
                            }
                        }

                    }
                }
                catch (System.Text.Json.JsonException ex)
                {
                    Console.WriteLine($"Erro ao desserializar o usuário: {ex.Message}");
                }
            }
        }
        else
        {
            Console.WriteLine("Header 'access_token' não encontrado ou inválido.");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var disconnectedUser = Users.Values.FirstOrDefault(u => u.ConnectionId == Context.ConnectionId);
        if (disconnectedUser != null)
        {
            Users.TryRemove(disconnectedUser.Id, out _);
            Console.WriteLine($"Usuário desconectado: {disconnectedUser.Name} (ID: {disconnectedUser.Id})");
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string type, string message, int fromUserId, int toUserId)
    {
        Console.WriteLine($"Verificando destinatário: {toUserId}");
        if (Users.TryGetValue(toUserId, out var recipient))
        {
            Console.WriteLine($"Destinatário encontrado: {recipient.ConnectionId}");
            await Clients.Client(recipient.ConnectionId).ReceiveMessage(type, message, Convert.ToInt32(fromUserId));
            Console.WriteLine($"Mensagem enviada de {fromUserId} para {toUserId}: {message}");
        }
        else
        {
            Console.WriteLine($"Usuário {toUserId} offline. Armazenando mensagem pendente...");
            var list = PendingMessages.GetOrAdd(toUserId, _ => new());
            lock (list)
            {
                list.Add((type, message, fromUserId));
            }
        }

    }

    public Task<List<User>> GetUsers()
    {
        var users= Users.Values.ToList();
        return Task.FromResult(users);
    }

}
