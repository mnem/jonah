# Purty colours
require 'highline/import'
begin
  require 'Win32/Console/ANSI' if RUBY_PLATFORM =~ /win32/
rescue LoadError
  raise 'You must `gem install win32console` to use color on Windows'
end

# Actual useful parts of the rake file
OUTPUT = 'app.js'

def get_source_list
    files = Dir.glob('coffee/*/**/*.coffee')
    files.sort!
    files << Dir.glob('coffee/*.coffee')
    files.flatten!
end

def generate_compile_fragment
    $last_source_list = get_source_list
    "-cj #{OUTPUT} #{$last_source_list.join(" ")}"
end

def file_lists_identical?(a, b)
    return false unless a.length == b.length
    a.each { |file| return false unless b.include? file }
    true
end

def command_echoing_output(cmd, exit_when_file_list_changes = false)
    say "<%=color('#{cmd}', RED)%>"
    IO::popen(cmd) do |o|
        if exit_when_file_list_changes
            watch_for_new_files_thread = Thread.new do
                while file_lists_identical? get_source_list, $last_source_list
                    sleep 1
                end
                say "<%=color(''.center(76, ' '), WHITE, ON_BLUE)%>"
                say "<%=color('Available coffee source files changed.'.center(76, ' '), WHITE, ON_BLUE)%>"
                say "<%=color(''.center(76, ' '), WHITE, ON_BLUE)%>"
                Process.kill 'INT', o.pid
            end
        end

        o.each { |output| print output }

        watch_for_new_files_thread.join if exit_when_file_list_changes
    end
end

desc "Deletes generated files"
task :clean do
    File.delete OUTPUT if File.exists? OUTPUT
end

desc "Generates builder JavaScript"
task :default do
    say "<%=color('Compiling coffee files to ', WHITE)%><%=color('#{OUTPUT}', GREEN)%>"
    command_echoing_output "coffee #{generate_compile_fragment}"
end

desc "Watches the files and recompiles as necessary"
task :watch do
    while true
        say "<%=color('Watching for changed files. Press CTRL-C to end.'.center(76, ' '), BLACK, ON_WHITE)%>"
        say "<%=color('Compiling coffee files to ', WHITE)%><%=color('#{OUTPUT}', GREEN)%>"
        command_echoing_output "coffee -w #{generate_compile_fragment}", true
    end
end
