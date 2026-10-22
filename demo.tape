# MockForge Demo Recording (Charm VHS)
# Run with: vhs demo.tape

Output demo.gif

Set FontSize 14
Set Width 900
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Framerate 30

# Launch MockForge server in watch mode with artificial latency
Type "npx mockforge ./tests/fixtures/simple-petstore.yaml --watch --delay 150"
Sleep 1.5s
Enter
Sleep 2.5s

# Query the mock server in a subshell / client call showing Prefer header
Type "curl -i http://localhost:4000/pets -H 'Prefer: code=200'"
Sleep 1.5s
Enter
Sleep 3s
