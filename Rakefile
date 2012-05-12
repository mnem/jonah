# Purty colours
require 'highline/import'
begin
  require 'Win32/Console/ANSI' if RUBY_PLATFORM =~ /win32/
rescue LoadError
  raise 'You must `gem install win32console` to use color on Windows'
end

# Actual useful parts of the rake file

# Set this to nil to compile everything as modules. Otherwise, the
# filename specified here is where everything is munged into. For
# example, 'app.js'
MONOLITHIC_FILE = nil

# The directory in which to output the files
OUTPUT_DIR = 'node_app'

def get_source_list
    files = Dir.glob('coffee/*/**/*.coffee')
    files.sort!
    files << Dir.glob('coffee/*.coffee')
    files.flatten!
end

def file_lists_identical?(a, b)
    return false unless a.length == b.length
    a.each { |file| return false unless b.include? file }
    true
end

def compile(files, options = nil, exit_when_file_list_changes = false)
    if files != nil and files.length > 0
        opts = ""
        opts = options.join ' ' unless options == nil

        command_echoing_output "coffee #{opts} #{files.join(' ')}", exit_when_file_list_changes
    end
end

def command_echoing_output(cmd, exit_when_file_list_changes = false)
    say "<%=color('#{cmd}', RED)%>"
    IO::popen(cmd) do |o|
        if exit_when_file_list_changes
            watch_for_new_files_thread = Thread.new do
                while file_lists_identical? get_monolithic_source_list, $last_source_list
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
    say "<%=color('Deleting JavaScript files in ', WHITE)%><%=color('#{OUTPUT_DIR}', GREEN)%>"
    files = Dir.glob File.join(OUTPUT_DIR, '**', '*.js')
    files.each do
        |f|
        say "<%=color('Deleting #{f}', RED)%>"
        File.delete f
    end
end

desc "Generates builder JavaScript"
task :default do
    files = get_source_list
    if MONOLITHIC_FILE != nil
        say "<%=color('Compiling coffee files to ', WHITE)%><%=color('#{File.join(OUTPUT_DIR, MONOLITHIC_FILE)}', GREEN)%>"
        compile files, ["-o #{OUTPUT_DIR}", "-j #{MONOLITHIC_FILE}", '-c']
    else
        say "<%=color('Compiling coffee files to ', WHITE)%><%=color('#{OUTPUT_DIR}', GREEN)%>"
        compile files, ["-o #{OUTPUT_DIR}", '-c']
    end
end

desc "Watches the files and recompiles as necessary"
task :watch do
    while true
        say "<%=color('Watching for changed files. Press CTRL-C to end.'.center(76, ' '), BLACK, ON_WHITE)%>"
        files = get_source_list
        if MONOLITHIC_FILE != nil
            say "<%=color('Compiling coffee files to ', WHITE)%><%=color('#{File.join(OUTPUT_DIR, MONOLITHIC_FILE)}', GREEN)%>"
            compile files, ["-o #{OUTPUT_DIR}", "-j #{MONOLITHIC_FILE}", '-w', '-c']
        else
            say "<%=color('Compiling coffee files to ', WHITE)%><%=color('#{OUTPUT_DIR}', GREEN)%>"
            compile files, ["-o #{OUTPUT_DIR}", '-w', '-c']
        end
    end
end
