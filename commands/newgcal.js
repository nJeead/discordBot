const {PREFIX} = require('./config.json');
const gcal = require('./GCal');

module.exports = {
    name: "newgcal",
    aliases: ["newcal"],
    description: "create a new Google calendar",
    syntax: `${PREFIX}newcal [name] [description (optional)]`,
    async run(message, args) {
        const account = gcal.getAccount();

        let calname = args[0];
        let caldesc = args.join(' ');
        if (!calname) {
            message.channel.send("Please enter calendar name!");
            return;
        }

        const newcal = {
            summary: calname,
            description: caldesc,
            timeZone: "America/Chicago"
        }

        if (!await gcal.findCalendar(account, calname)) {
            account.calendars.insert({
                resource: newcal,
            }).then(res => {
                    message.react("👍");
                },
                err => {
                    message.channel.send("Something went wrong: " + err);
                    console.error("Error\n", err)
                });
        } else {
            message.channel.send("Calendar already exists");
        }
    }
}