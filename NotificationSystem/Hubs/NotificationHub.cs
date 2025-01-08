using Microsoft.AspNetCore.SignalR;
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
    private static readonly Dictionary<int, User> Users = [];

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();

        if (httpContext != null && httpContext.Request.Query.TryGetValue("access_token", out var value))
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
            Users.Remove(disconnectedUser.Id);
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
            Console.WriteLine($"Usuário destinatário com ID {toUserId} não está conectado.");
        }

    }

    public Task<List<User>> GetUsers()
    {
        var users= Users.Values.ToList();
        return Task.FromResult(users);
    }

}
