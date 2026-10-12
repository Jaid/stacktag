import Project from 'stacktag'

const project = await Project.detect('C:/Users/jaid/git/stacktag')
// [{id: 'git', name: 'Git', value: {head: 'main', headType: 'branch'}}, {id: 'git_like', name: 'Git-like', value: undefined}, …]
console.log(project.getTags())
